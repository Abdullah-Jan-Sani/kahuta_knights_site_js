'use strict';
const nunjucks = require('nunjucks');
const config = require('./config');
const { getFlashedMessages } = require('./flash');
const { templateUrlFor } = require('./router');

/** Jinja-compatible templating (Nunjucks) with autoescape on, like Flask. */
function configureViews(app) {
  const env = nunjucks.configure(config.TEMPLATES_DIR, {
    autoescape: true,
    express: app || undefined,
    noCache: process.env.NODE_ENV !== 'production',
  });
  env.addGlobal('url_for', templateUrlFor);
  if (app) app.set('view engine', 'html');
  return env;
}

/** Variables available on every page (Flask context_processor + get_flashed_messages). */
function injectLocals(req, res, next) {
  res.locals.current_year = new Date().getFullYear();
  res.locals.is_admin = Boolean(req.session && req.session.admin_authenticated);
  res.locals.get_flashed_messages = (kwargs) =>
    getFlashedMessages(req, Boolean(kwargs && kwargs.with_categories));
  next();
}

module.exports = { configureViews, injectLocals };
