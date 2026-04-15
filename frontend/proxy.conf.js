module.exports = {
  '/api': {
    target: 'http://localhost:3000',
    secure: false,
    pathRewrite: { '^/api': '' },
    proxyTimeout: 10000,
    timeout: 10000,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        // Return 503 quietly for any backend connectivity issue
        if (res && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend not ready' }));
        }
      });
    },
  },
};
