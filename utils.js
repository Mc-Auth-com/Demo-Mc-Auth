const errLogStream = require('rotating-file-stream').createStream('error.log', {
  interval: '1d',
  maxFiles: 90,
  path: require('path').join(__dirname, 'logs', 'runtime-error')
});
errLogStream.on('error', (err) => {
  console.error(err); // Don't crash whole application, just print
  // once this event is emitted, the stream will be closed as well
});

module.exports = {
  Storage: require('./storage'),

  /**
   * @param {Number} HTTPStatusCode The HTTP-StatusCode
   * @param {String} message A short description (or message)
   * 
   * @returns {Error}
   */
  createError(HTTPStatusCode = 500, message = 'An unknown error has occurred', hideFromConsole = false) {
    let err = new Error(message);
    err.status = HTTPStatusCode;
    err.hideFromConsole = hideFromConsole;

    return err;
  },

  /**
   * @param {Error} error
   * 
   * @returns {Error}
   */
  logAndCreateError(error) {
    console.error(error);

    errLogStream.write(JSON.stringify({
      time: new Date().toUTCString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,

        error
      }
    }) + module.exports.EOL, 'utf-8', console.error);

    return module.exports.createError(undefined, undefined, true);
  },

  /**
   * @param {String} input 
   * 
   * @returns {Boolean}
   */
  toBoolean(input) {
    if (input) {
      if (typeof input === 'string') return input === '1' || input.toLowerCase() === 'true' || input.toLowerCase() === 't';
      if (typeof input === 'number') return input === 1;
      if (typeof input === 'boolean') return input;
    }

    return false;
  },

  /**
   * @callback ReplacerCallback
   * @param {String} str
   */
  /**
   * 
   * @param {String} text 
   * @param {String} startToken 
   * @param {String} endToken 
   * @param {ReplacerCallback} callback 
   * 
   * @author NudelErde
   */
  replacer(text, startToken, endToken, callback) {
    let startIndex = text.indexOf(startToken);

    while (startIndex != -1) {
      startIndex += startToken.length;
      let tmp = text.substring(startIndex);
      let endIndex = tmp.indexOf(endToken);

      tmp = callback(tmp.substring(0, endIndex));

      text = text.substring(0, startIndex - startToken.length) + tmp + text.substring(startIndex + endIndex + endToken.length);
      startIndex = text.indexOf(startToken);
    }

    return text;
  },

  HTML: {
    /* Replace */
    replaceVariables(req, html) {
      return module.exports.replacer(html, '${', '}', (str) => {
        try {
          switch (str) {
            /* Static */
            case 'HTML_HEADER': return module.exports.Storage.HEADER;
            case 'HTML_FOOTER': return module.exports.Storage.FOOTER;
            case 'HTML_HEAD_TOP': return module.exports.Storage.HEAD_TOP;
            case 'HTML_HEAD_BOTTOM': return module.exports.Storage.HEAD_BOTTOM;

            case 'URL_STATIC_CONTENT': return module.exports.Storage.STATIC_CONTENT_URL;
            case 'URL_BASE': return module.exports.Storage.BASE_URL;
            case 'MC_AUTH_URL': return module.exports.Storage.MC_AUTH_URL;
            case 'URL_DOCS': return module.exports.Storage.DOCS_URL;

            /* Dynamic */
            case 'AUTH_ERR': return req.query['error'] || 'No error';
            case 'AUTH_ERR_DESC': return req.query['error_description'] || 'No description';

            /* Cookies */
            case 'Minecraft_Username': return req.session['mc_Name'] || 'Unknown username';
            case 'Minecraft_UUID': return req.session['mc_UUID'] || 'Unknown UUID';

            default: break;
          }
        } catch (err) {
          module.exports.logAndCreateError(err);
        }

        return '';
      });
    },

    /* Format */
    formatHTML(req, html) {
      return module.exports.replacer(html, '?{', '?}', (str) => {
        if (str.startsWith('LoggedIn:')) {
          if (req.session['loggedIn']) {
            return str.substring('LoggedIn:'.length, str.lastIndexOf('?:'));
          }

          let index = str.lastIndexOf('?:');

          return index >= 0 ? str.substring(index + 2) : '';
        } else if (str.startsWith('AuthErr:')) {
          if (req.query['success'] && !module.exports.toBoolean(req.query['success'])) {
            return str.substring('AuthErr:'.length, str.lastIndexOf('?:'));
          }

          let index = str.lastIndexOf('?:');

          return index >= 0 ? str.substring(index + 2) : '';
        } else if (str.startsWith('AuthSuccess:')) {
          if (req.query['success'] && module.exports.toBoolean(req.query['success'])) {
            return str.substring('AuthSuccess:'.length, str.lastIndexOf('?:'));
          }

          let index = str.lastIndexOf('?:');

          return index >= 0 ? str.substring(index + 2) : '';
        }

        return '';
      });
    }
  },

  Express: {
    staticDynamicRouter(html) {
      const router = require('express').Router();

      router.get('/', module.exports.Express.staticDynamicHandler(html));

      return router;
    },

    staticDynamicHandler(html) {
      return (req, res, _next) => {
        module.exports.Express.handleStaticDynamic(req, res, html);
      };
    },

    handleStaticDynamic(req, res, html) {
      return res.send(module.exports.HTML.formatHTML(req, module.exports.HTML.replaceVariables(req, html)));
    }
  },

  EOL: require('os').EOL
};