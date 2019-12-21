const Utils = require('../utils');

const router = require('express').Router();

const oAuthURL = `${Utils.Storage.MC_AUTH_URL}/oauth2/authorize?response_type=code&client_id=${require('../storage/config')['application']['client_id']}&redirect_uri=${Utils.Storage.BASE_URL}/callback&scope=profile`;
router.get('/', (_req, res, _next) => {
  res.redirect(oAuthURL);
});

module.exports = router;