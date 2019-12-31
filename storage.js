const BASE_URL = 'https://demo.mc-auth.com',  // lowercase and no trailing '/' !
  STATIC_CONTENT_URL = 'https://mc-auth.com',
  MC_AUTH_URL = 'https://mc-auth.com',
  DOCS_URL = 'https://github.com/Mc-Auth-com/Mc-Auth-Web/wiki';

const HEAD_TOP = (require('fs').readFileSync('./html/_head_top.html', { encoding: 'UTF-8' })),
  HEAD_BOTTOM = (require('fs').readFileSync('./html/_head_bottom.html', { encoding: 'UTF-8' })),

  HEADER = require('fs').readFileSync('./html/_header.html', { encoding: 'UTF-8' }),
  FOOTER = require('fs').readFileSync('./html/_footer.html', { encoding: 'UTF-8' }),

  INDEX = require('fs').readFileSync('./html/index.html', { encoding: 'UTF-8' });

module.exports = {
  BASE_URL, STATIC_CONTENT_URL, MC_AUTH_URL, DOCS_URL,

  HEAD_TOP, HEAD_BOTTOM,
  HEADER, FOOTER,

  INDEX
};