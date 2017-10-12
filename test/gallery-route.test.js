'use strict';

const app = require('../server');
const request = require('supertest')(app);
const { expect } = require('chai');

const debug = require('debug')('app:test/gallery-route');

const Gallery = require('../model/gallery');
const User = require('../model/user');
require('../lib/mongoose-connect');

const example = require('./lib/examples');
const { user: exampleUser, gallery: exampleGallery } = example;

describe('Gallery Routes', function () {
  beforeEach(async function () {
    this.testUser = await User.createUser(exampleUser);
    this.testToken = await this.testUser.generateToken();
  });
  afterEach(async function () {
    delete this.testUser;
    delete this.testToken;

    await User.remove({});
    await Gallery.remove({});
  });
  describe('POST /api/gallery', function () {
    it('should return a gallery', function () {
      return request
        .post('/api/gallery')
        .set({
          Authorization: `Bearer ${this.testToken}`,
        })
        .send(exampleGallery)
        .expect(200)
        .expect(res => {
          expect(res.body.name).to.equal(exampleGallery.name);
          expect(res.body).to.have.property('desc', exampleGallery.desc);
          expect(res.body.created).to.not.be.undefined;
        });
    });
    it('should return 400 given bad JASON', function () {
      return request
        .post('/api/gallery')
        .set({ Authorization: `Bearer ${this.testToken}` })
        .set('Content-Type', 'application/json')
        .send('["bad jason!"]x')
        .expect(400);
    });
    it('should return 400 given JASON without desc', function () {
      return request
        .post('/api/gallery')
        .set({ Authorization: `Bearer ${this.testToken}` })
        .send({ name: 'whatever' })
        .expect(400);
    });
    it('should return 400 given JASON without name', function () {
      return request
        .post('/api/gallery')
        .set({ Authorization: `Bearer ${this.testToken}` })
        .send({ desc: 'whatever' })
        .expect(400);
    });
  });

  describe('GET /api/gallery[/:id]', function () {
    describe('fetch all galleries',function(){
      beforeEach(async function(){
        return this.testGallery = await Gallery.createGallery({name: 'test gallery',desc: 'description',userID:this.testUser})
      });
      it('should return a list of galleries',function(){
        return request
          .get('/api/galleries')
          .set({Authorization: `Bearer ${this.testToken}`})
          .expect(200)
          .expect(res => {
            expect(typeof res.body).to.be.equal('object');
            expect(res.body[0].name).to.be.equal(this.testGallery.name);
            expect(res.body[0].desc).to.be.equal(this.testGallery.desc);
          })
      })
    })

    describe('invalid id', function () {
      it('should return 404', function () {
        return request
          .get('/api/gallery/missing')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('missing id', function () {
      it('should return 404', function () {
        return request
          .get('/api/gallery/deadbeefdeadbeefdeadbeef')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('valid id', function () {
      beforeEach(async function () {
        // NO: exampleGallery.userID = this.testUser._id.toString();
        this.testGallery = await new Gallery({
          ...exampleGallery,
          userID: this.testUser._id.toString(),
        }).save();
      });
      it('should return a gallery', function () {
        return request
          .get(`/api/gallery/${this.testGallery._id}`)
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.equal(exampleGallery.name);
            expect(res.body).to.have.property('desc', exampleGallery.desc);
            expect(res.body.created).to.not.be.undefined;
          });
      });
      describe(`someone else's gallery`, function () {
        beforeEach(async function () {
          this.hacker = await User.createUser({ username: 'imposter', email: 'imposter@example.com', password: 'hack' });
          this.hackerToken = await this.hacker.generateToken();
        })
        it('should return 404', function () {
          return request
            .get(`/api/gallery/${this.testGallery._id}`)
            .set({
              Authorization: `Bearer ${this.hackerToken}`,
            })
            .expect(404);
        })
      });
    })
  });

  describe('DELETE /api/gallery/:id', function () {
    describe('invalid id', function () {
      it('should return 404', function () {
        return request
          .delete('/api/gallery/missing')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('missing id', function () {
      it('should return 404', function () {
        return request
          .delete('/api/gallery/deadbeefdeadbeefdeadbeef')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('valid id', function () {
      beforeEach(async function () {
        // NO: exampleGallery.userID = this.testUser._id.toString();
        this.testGallery = await new Gallery({
          ...exampleGallery,
          userID: this.testUser._id.toString(),
        }).save();
      });
      it('should return a gallery', async function () {
        await request
          .delete(`/api/gallery/${this.testGallery._id}`)
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(204);

        var deleted = await Gallery.findById(this.testGallery._id);
        expect(deleted).to.be.null;
      });
      describe(`someone else's gallery`, function () {
        beforeEach(function () {
          return User.createUser({ username: 'imposter', email: 'imposter@example.com', password: 'hack' })
            .then(hacker => this.hacker = hacker)
            .then(hacker => hacker.generateToken())
            .then(hackerToken => this.hackerToken = hackerToken);
        })
        it('should return 404', function () {
          return request
            .delete(`/api/gallery/${this.testGallery._id}`)
            .set({ Authorization: `Bearer ${this.hackerToken}` })
            .expect(404);
        })
      });
    })
  });

  describe('PUT /api/gallery/:id', function () {
    describe('invalid id', function () {
      it('should return 404', function () {
        return request
          .put('/api/gallery/missing')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('missing id', function () {
      it('should return 404', function () {
        return request
          .put('/api/gallery/deadbeefdeadbeefdeadbeef')
          .set({ 'Authorization': `Bearer ${this.testToken}` })
          .expect(404);
      });
    });
    describe('valid id', function () {
      beforeEach(function () {
        // NO: exampleGallery.userID = this.testUser._id.toString();
        return new Gallery({
          ...exampleGallery,
          userID: this.testUser._id.toString(),
        }).save()
          .then(gallery => this.testGallery = gallery);
      });
      describe(`authenticated user's gallery`, function () {
        it('should return a gallery', function () {
          return request
            .put(`/api/gallery/${this.testGallery._id}`)
            .set({ 'Authorization': `Bearer ${this.testToken}` })
            .send({ name: 'updated', desc: 'new desc' })
            .expect(200)
            .expect(res => {
              expect(res.body.name).to.equal('updated');
              expect(res.body).to.have.property('desc', 'new desc');
              expect(res.body.created).to.not.be.undefined;
            });
        });
      });
      describe(`someone else's gallery`, function () {
        beforeEach(function () {
          return User.createUser({ username: 'imposter', email: 'imposter@example.com', password: 'hack' })
            .then(hacker => this.hacker = hacker)
            .then(hacker => hacker.generateToken())
            .then(hackerToken => this.hackerToken = hackerToken);
        })
        it('should return 404', function () {
          return request
            .put(`/api/gallery/${this.testGallery._id}`)
            .set({ Authorization: `Bearer ${this.hackerToken}` })
            .send({ name: 'updated', desc: 'new desc' })
            .expect(404);
        })
      });
    })
  });
});
