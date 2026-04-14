module.exports = {
  '/api': {
    target: 'http://localhost:3000',
    secure: false,
    pathRewrite: { '^/api': '' },
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        if (err.code === 'ECONNREFUSED') {
          // Backend not up yet — return 503 quietly instead of logging a red error
          if (res && !res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend not ready' }));
          }
        }
      });
    },
  },
};
