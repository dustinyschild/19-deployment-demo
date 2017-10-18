'use strict';
const createError = require('http-errors');
const request = require('superagent');

const jsonParser = require('body-parser').json();
const debug = require('debug')('app:route/auth');
const Router = require('express').Router;

const basicAuth = require('../lib/basic-auth-middleware.js');

const User = require('../model/user');

const router = module.exports = new Router();

router.get('/api/signin', basicAuth, function (req, res, next) {
  debug('GET /api/signin');

  User.findOne({ username: req.auth.username })
    .then(user => {
      if (!user) {
        return next(createError(401, 'User not found'));
      }
      return user;
    })
    .then(user => user.comparePasswordHash(req.auth.password))
    .then(user => user.generateToken())
    .then(token => res.send(token))
    .catch(next);
});

router.post('/api/signup', jsonParser, function (req, res, next) {
  debug('POST /api/signup');

  User.createUser(req.body)
    .then(user => user.generateToken())
    .then(token => res.send(token))
    .catch(next);
});

//
//GOOGLE OAUTH
//

function redirectToClient(res,reason){
  debug('redirecting...',reason);
  res.redirect(`${process.env.CLIENT_URL}${process.env.CLIENT_URL.indexOf('?') ? '?' : '&'}reason=${reason}`)
}

router.get('/login/google',(req,res,next) => {
  if(!req.query){
    redirectToClient(res,'no query parameters');
    throw new Error('No query params');
  }

  let AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  let clientId = `client_id=${process.env.GOOGLE_CLIENT_ID}`;
  let oauthStuff = 'response_type=code&scope=openid%20profile%20email';
  let redirectUri = `redirect_uri=${process.env.API_URL}/oauth/google/code`;

  let actualUrl = `${AUTH_URL}?${clientId}&${oauthStuff}&${redirectUri}`;

  debug(clientId);
  debug(oauthStuff);
  debug(redirectUri);
  debug(actualUrl);

  console.log(actualUrl);
  res.redirect(actualUrl)
});


router.get(`/oauth/google/code`,(req,res,next) => {
  if (!req.query.code) redirectToClient(res, 'no-code');
  else {
    debug('__REQUEST_TOKEN__',req.query.code);
    debug(process.env.API_URL);
    request.post(`https://www.googleapis.com/oauth2/v4/token`)
      .type('form')
      .send({
        code: req.query.code,
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.API_URL}/oauth/google/code`
      })
      .then(res => {
        debug('__REQUEST_USER__', res.body);
        return request.get('https://www.googleapis.com/plus/v1/people/me/openIdConnect')
          .set({ Authorization: `Bearer ${res.body.access_token}`});
      })
      .then(res => {
        debug('__SUCCESS__ GET /oauth2/v4/token ');
        return User.handleOAuth(res.body);
      })
      .then(user => user.tokenCreate())
      .then(token => {
        debug('__OAUTH_TOKEN__ ',token);
        res.cookie('X-Insta-Token',token);
        redirectToClient(res, 'authorized');
      })
      .catch(err => {
        debug('err:',err.message);
        redirectToClient(res,'error');
      });
  }
});
