'use strict';
const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 5000;
// Local dev stays on loopback; hosting platforms that inject PORT need 0.0.0.0.
const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

createApp().listen(port, host, () => {
  console.log(`Kahuta Knights site running at http://${host}:${port}`);
});
