const Utils = require('../utils');

const router = require('express').Router();

const secureCookies = require('../storage/config.json')['secureCookies'];
router.get('/', (_req, res, _next) => {
  res.clearCookie('mcProfile', { httpOnly: true, secure: secureCookies });

  res.redirect(Utils.Storage.BASE_URL);
});

module.exports = router;