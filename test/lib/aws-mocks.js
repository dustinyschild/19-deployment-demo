'use strict';

const debug = require('debug')('app:test/aws-mocks');
const sinon = require('sinon');

const AWS = module.exports = require('aws-sdk');

AWS.mock = function (module, method, fakeFunction) {
  let proxy = createProxy(module, method);
  if (fakeFunction && typeof proxy.callsFake === 'function') {
    proxy.callsFake(fakeFunction);
  }
  return proxy;
}

function createProxy(module, method) {
  const prototype = AWS[module].prototype;
  if (prototype[method].isSinonProxy)
    return prototype[method];

  if (process.env.AWS_ACCESS_KEY_ID)
    return sinon.spy(prototype, method);

  return sinon.stub(prototype, method);
};

/*
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
*/
