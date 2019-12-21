const Utils = require('../utils');

const request = require('request');

const router = require('express').Router();

const cfg = require('../storage/config'),
  secureCookies = cfg['secureCookies'];

router.get('/', (req, res, next) => {
  if (!req.query['code']) return res.redirect(Utils.Storage.BASE_URL + `?success=0&error=${req.query['error']}&error_description=${req.query['error_description']}`);

  request('http://localhost:8091/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: req.query['code'],
      client_id: cfg['application']['client_id'],
      client_secret: cfg['application']['client_secret'],
      redirect_uri: `${Utils.Storage.BASE_URL}/callback`,
      grant_type: 'authorization_code'
    })
  }, (err, httpRes, body) => {
    if (err) return next(Utils.logAndCreateError(err));

    body = JSON.parse(body);

    if (httpRes.statusCode == 200 && body['data'] && body['data']['profile']) {
      res.cookie('mcProfile', body['data']['profile'], { httpOnly: true, secure: secureCookies });

      return res.redirect(Utils.Storage.BASE_URL + '?success=1');
    }

    return res.redirect(Utils.Storage.BASE_URL + '?success=0');
  });
});

module.exports = router;