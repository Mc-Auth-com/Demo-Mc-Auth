const Utils = require('./utils');

const express = require('express'),
  morgan = require('morgan');

const logFormat = '[:date[web]] :remote-addr by :remote-user | :method :url :status with :res[content-length] bytes | ":user-agent" referred from ":referrer" | :response-time[3] ms';
const accessLogStream = require('rotating-file-stream').createStream('access.log', {
  interval: '1d',
  maxFiles: 7,
  path: require('path').join(__dirname, 'logs', 'access')
}),
  errorLogStream = require('rotating-file-stream').createStream('error.log', {
    interval: '1d',
    maxFiles: 90,
    path: require('path').join(__dirname, 'logs', 'error')
  });

accessLogStream.on('error', (err) => {
  console.error(err); // Don't crash whole application, just print
  // once this event is emitted, the stream will be closed as well
});
errorLogStream.on('error', (err) => {
  console.error(err); // Don't crash whole application, just print
  // once this event is emitted, the stream will be closed as well
});

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', require('./storage/config.json')['trustProxy']);

// Log to console and file
app.use(morgan('dev'));
app.use(morgan('dev', { skip(req, res) { return res.statusCode < 400 || res.hideFromConsole || req.originalUrl.startsWith('/.well-known/acme-challenge/'); } }));
app.use(morgan(logFormat, { stream: accessLogStream }));
app.use(morgan(logFormat, { skip(req, res) { return res.statusCode < 400 || res.hideFromConsole || req.originalUrl.startsWith('/.well-known/acme-challenge/'); }, stream: errorLogStream }));

app.use(require('cookie-parser')());
app.use((req, _res, next) => {
  req.session = {};

  if (req.cookies['mcProfile'] &&
    typeof req.cookies['mcProfile'] == 'object' &&
    req.cookies['mcProfile']['id'] &&
    req.cookies['mcProfile']['name']) {
    req.session['loggedIn'] = true;

    req.session['mc_Name'] = req.cookies['mcProfile']['name'];
    req.session['mc_UUID'] = req.cookies['mcProfile']['id'];
  }

  next();
});

// Default response headers
app.use((_req, res, next) => {
  res.set({
    'Cache-Control': 'private, max-age=0'
  });

  next();
});

// ToDo Set caching headers on routes
app.use('/', Utils.Express.staticDynamicRouter(Utils.Storage.INDEX));
app.use('/callback', require('./routes/callback'));
app.use('/logout', require('./routes/logout'));
app.use('/login', require('./routes/login'));

// Send 404 (Not Found)
app.use((_req, res, _next) => {
  res.sendStatus(404);
});

// Send Error
app.use((err, _req, res, _next) => {
  if (!err || !(err instanceof Error)) {
    if (err) console.error('Invalid Error provided:', err);

    err = Utils.createError();
  }

  if (!err.hideFromConsole && (!err.status || (err.status >= 500 && err.status < 600))) {
    console.error(err); // Log to file
  }

  if (err.hideFromConsole) res.hideFromConsole = true;

  if (!res.headersSent) {
    res.status(err.status || 500)
      .json({
        status: err.status,
        msg: err.message
      });
  }
});

module.exports = app;