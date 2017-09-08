'use strict';

const debug = require('debug')('app:test/aws-mocks');
module.exports = exports = {};

if (process.env.AWS_ACCESS_KEY_ID) {
  debug('AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID);
  return;
}

const AWS = require('aws-sdk-mock');

const mock = exports.uploadMock = {
  ETag: '"deadbeef"',
  Location: 'https://example.com/mock.png',
  Key: '1234.png',
  Bucket: process.env.AWS_BUCKET,
};

AWS.mock('S3', 'upload', function (params, callback) {
  if (params.ACL !== 'public-read') {
    return callback(new Error('ACL must be public-read'));
  }
  if (params.Bucket !== mock.Bucket) {
    return callback(new Error('Bucket is wrong'));
  }
  if (!params.Key) {
    return callback(new Error('Key is required'));
  }
  if (!params.Body) {
    return callback(new Error('Body is required'));
  }
  callback(null, mock);
});