'use strict';
const express = require('express');
const cookieSession = require('cookie-session');
const multer = require('multer');

const config = require('./config');
const { configureViews, injectLocals } = require('./views');
const { createRouter } = require('./router');
const { createMailer } = require('./mailer');
const { registerPublicRoutes } = require('./routes/public');
const { registerSubmitRoutes } = require('./routes/submit');
const { registerAdminRoutes } = require('./routes/admin');

function createApp({ mailer = createMailer() } = {}) {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY === '1');
  app.disable('x-powered-by');

  if (config.SECRET_KEY === 'default-fallback-key') {
    console.warn('WARNING: SECRET_KEY is not set; using an insecure default. Set it in .env.');
  }

  configureViews(app); // Jinja-compatible templates (autoescape on, like Flask)

  // Static files (css, images, uploaded posters / payment screenshots)
  app.use('/static', express.static(config.STATIC_DIR));

  // Signed-cookie session (Flask's session equivalent)
  app.use(cookieSession({
    name: 'session',
    keys: [config.SECRET_KEY],
    sameSite: 'lax',
    httpOnly: true,
  }));

  app.use(express.urlencoded({ extended: false }));

  app.use(injectLocals); // current_year, is_admin, get_flashed_messages

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.MAX_CONTENT_LENGTH, files: 5 },
  });

  const route = createRouter(app, { upload });
  registerPublicRoutes(route);
  registerSubmitRoutes(route, { mailer });
  registerAdminRoutes(route, { mailer });

  // 404 + error handling
  app.use((req, res) => res.status(404).type('text/plain').send('Not Found'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).type('text/plain').send('File too large (max 15 MB).');
    }
    console.error(err);
    return res.status(500).type('text/plain').send('Internal Server Error');
  });

  return app;
}

module.exports = { createApp };
