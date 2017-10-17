'use strict';

const app = require('../server');
const request = require('supertest')(app);
const { expect, use } = require('chai');
use(require('chai-string'));
const path = require('path');
const AWS = require('./lib/aws-mocks.js');

const debug = require('debug')('app:test/pic-route');

const Pic = require('../model/pic');
const Gallery = require('../model/gallery');
const User = require('../model/user');
require('../lib/mongoose-connect');

const example = require('./lib/examples');

debug(example);

describe.only('Pic Routes', function () {
  beforeEach(function setTestUser() {
    return User.createUser(example.user)
      .then(user => this.testUser = user)
      .then(user => user.generateToken())
      .then(token => this.testToken = token);
  });
  beforeEach(function setTestGallery() {
    return new Gallery({
      ...example.gallery,
      userID: this.testUser._id.toString(),
    }).save()
      .then(gallery => this.testGallery = gallery)
      .then(() => debug('testGallery', this.testGallery));
  });
  afterEach(function deleteEverything() {
    delete this.testUser;
    delete this.testToken;

    return Promise.all([
      User.remove({}),
      Gallery.remove({}),
      Pic.remove({}),
    ]);
  });

  beforeEach(function fakeS3Upload() {
    this.uploadSpy = AWS.mock('S3', 'upload', (options, callback) => {
      callback(null, {
        Bucket: options.Bucket,
        Key: options.Key,
        Location: `https://example.com/${options.Key}`,
      });
    });
  });
  afterEach(function resetS3Upload() {
    this.uploadSpy.reset();
  });

  describe('POST /api/gallery/:id/pic', function () {
    it('should return 401 without Authorization', function (){
      return request
        .post(`/api/gallery/${this.testGallery._id}/pic`)
        .expect(401);
    })
    it('should return 404 with file but bad id', function (){
      return request
        .post(`/api/gallery/deadbeefdeadbeefdeadbeef/pic`)
        .set({ Authorization: `Bearer ${this.testToken}`, })
        .field({
          name: example.pic.name,
          desc: example.pic.desc,
        })
        .attach('image', example.pic.image)
        .expect(404);
    });
    it('should return 400 without file', function (){
      return request
        .post(`/api/gallery/${this.testGallery._id}/pic`)
        .set({ Authorization: `Bearer ${this.testToken}`, })
        .expect(400);
    });
    it('should return 400 with file but missing fields', function (){
      return request
        .post(`/api/gallery/${this.testGallery._id}/pic`)
        .set({ Authorization: `Bearer ${this.testToken}`, })
        .attach('image', example.pic.image)
        .expect(400);
    });
    it('should return a pic', async function () {
      let res = await request
        .post(`/api/gallery/${this.testGallery._id}/pic`)
        .set({ Authorization: `Bearer ${this.testToken}`, })
        .field({
          name: example.pic.name,
          desc: example.pic.desc,
        })
        .attach('image', example.pic.image)
        .expect(200)
        .expect(res => {
          expect(res.body.name).to.equal(example.pic.name);
          expect(res.body.desc).to.equal(example.pic.desc);
          expect(res.body.userID).to.equal(this.testUser._id.toString());
          expect(res.body.galleryID).to.equal(this.testGallery._id.toString());
        });

      let uploadOptions = this.uploadSpy.firstCall.args[0];
      expect(uploadOptions.ACL).to.equal('public-read');
      expect(uploadOptions.ContentType).to.equal('image/png');
      expect(uploadOptions.Body).to.not.be.undefined;

      let expectedFileName = `${path.basename(uploadOptions.Body.path)}-${path.basename(example.pic.image)}`;
      expect(uploadOptions.Key).to.equal(expectedFileName);

      debug(res.body.imageURI);
      expect(res.body.imageURI).to.endWith(uploadOptions.Key);
    });
  });
  describe('GET /api/pics',function(){
    beforeEach(function(){
      return new Gallery({
        ...example.gallery,
        userID: this.testUser._id.toString(),
      }).save()
        .then(gallery => this.testGallery2 = gallery)
        .then(() => debug('testGallery', this.testGallery2));
    });
    beforeEach(function(){
      return new Pic({
        name: 'pic',
        desc: 'description',
        imageURI: 'path',
        objectKey: 'key',
        userID: this.testUser._id,
        galleryID: this.testGallery._id
      }).save()
        .then(pic => {
          this.testPic = pic;
          debug(this.testPic,pic);
        });
    });
    beforeEach(function(){
      return new Pic({
        name: 'pic2',
        desc: 'description',
        imageURI: 'path2',
        objectKey: 'key2',
        userID: this.testUser._id,
        galleryID: this.testGallery2._id
      }).save()
        .then(pic => this.testPic2 = pic)
        .then(() => debug('__Test Pic__',this.testPic2));
    });
    it('should return objects of pics sorted by category',function(){
      return request.get(`/api/pics`)
        .set({Authorization: `Bearer ${this.testToken}`})
        .expect(200)
        .expect(res => {
          expect(typeof res.body).to.be.equal('object');
          expect(res.body).to.equal({
            [this.testGallery._id.toString()]: [
              this.testPic
            ],
            [this.testGallery2._id.toString()]: [
              this.testPic2
            ]
          });
        });
    });
  });
});
