let cfg;
let server;

function shutdownHook() {
  console.log('Shutting down...');

  server.close((err) => {
    if (err && err.message != 'Server is not running.') console.error(err);

    process.exit();
  });
}

process.on('SIGTERM', shutdownHook);
process.on('SIGINT', shutdownHook);
process.on('SIGQUIT', shutdownHook);
process.on('SIGHUP', shutdownHook);
process.on('SIGUSR2', shutdownHook);  // The package 'nodemon' is using this signal

initStorage(() => {
  cfg = require('./storage/config.json');

  server = require('http').createServer(require('./server'));
  server.on('error', (err) => {
    if (err.syscall !== 'listen') {
      throw err;
    }

    const prefix = (cfg.listen.usePath || process.env.UNIX_PATH) ? `path ${process.env.UNIX_PATH || cfg.listen.path}` : `port ${process.env.PORT || cfg.listen.port}`;
    switch (err.code) {
      case 'EACCES':
        console.error(
          prefix + ' requires elevated privileges'
        );
        process.exit(1);
      case 'EADDRINUSE':
        console.error(
          prefix + ' is already in use'
        );
        process.exit(1);
      default:
        throw err;
    }
  });

  server.on('listening', () => {
    console.log('Listening on ' +
      ((cfg.listen.usePath || process.env.UNIX_PATH) ? `path ${process.env.UNIX_PATH || cfg.listen.path}` : `port ${process.env.PORT || cfg.listen.port}`)
    );
  });

  if (cfg.listen.usePath || process.env.UNIX_PATH) {
    const fs = require('fs');

    const unixSocketPath = process.env.UNIX_PATH || cfg.listen.path,
      unixSocketPIDPath = (process.env.UNIX_PATH || cfg.listen.path) + '.pid',
      parentDir = require('path').dirname(unixSocketPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (fs.existsSync(unixSocketPath)) {
      let isRunning = false;
      if (!fs.existsSync(unixSocketPIDPath) || !(isRunning = isProcessRunning(parseInt(fs.readFileSync(unixSocketPIDPath, 'utf-8'))))) {
        fs.unlinkSync(unixSocketPath);
      }

      if (isRunning) {
        console.error(`It looks like the process that created '${unixSocketPath}' is still running!`);
        process.exit(1);
      }
    }

    fs.writeFileSync(unixSocketPIDPath, process.pid);
    server.listen(unixSocketPath);
    fs.chmodSync(unixSocketPath, 0777);
  } else {
    server.listen(process.env.PORT || cfg.listen.port, process.env.HOST || cfg.listen.host);
  }
});

async function initStorage(callback) {
  const fs = require('fs');

  if (!fs.existsSync('./storage/')) {
    fs.mkdirSync('./storage/');
  }

  if (!fs.existsSync('./storage/config.json')) {
    fs.writeFileSync('./storage/config.json', JSON.stringify(
      {
        listen: {
          usePath: false,
          path: './mcAuthDemo.unixSocket',

          host: '127.0.0.1',
          port: 8091
        },
        application: {
          client_id: 'YOUR_CLIENT_ID_HERE',
          client_secret: 'YOUR_CLIENT_SECRET_HERE'
        },
        trustProxy: false,
        secureCookies: false
      }
      , null, 4));

    console.log('./storage/config.json has been created!');
  }

  if (callback) {
    callback();
  }
}

function isProcessRunning(pid) {
  try {
    return process.kill(pid, 0);
  } catch (ex) {
    return ex.code === 'EPERM';
  }
}