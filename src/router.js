'use strict';
const { flash } = require('./flash');

/** endpoint name -> express path pattern. Mirrors Flask's endpoint registry so templates can keep url_for(). */
const endpoints = new Map();
endpoints.set('static', '/static/:filename');

const encodePath = (s) => String(s).split('/').map(encodeURIComponent).join('/');

/**
 * Flask-compatible url_for(endpoint, **values): path params fill the pattern,
 * remaining values become the query string.
 */
function urlFor(endpoint, values = {}) {
  const pattern = endpoints.get(endpoint);
  if (!pattern) throw new Error(`url_for: unknown endpoint "${endpoint}"`);

  const rest = { ...values };
  delete rest.__keywords; // added by Nunjucks for keyword args
  const path = pattern.replace(/:([A-Za-z_]\w*)(\([^)]*\))?/g, (_, name) => {
    if (!(name in rest)) throw new Error(`url_for: missing value "${name}" for endpoint "${endpoint}"`);
    const v = rest[name];
    delete rest[name];
    return name === 'filename' ? encodePath(v) : encodeURIComponent(v);
  });

  const query = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

/** Template-facing url_for: url_for('x', a=1) arrives as ('x', {a: 1, __keywords: true}). */
function templateUrlFor(endpoint, kwargs) {
  return urlFor(endpoint, kwargs && typeof kwargs === 'object' ? kwargs : {});
}

/** url_for(..., _external=True) */
function externalUrlFor(req, endpoint, values) {
  return `${req.protocol}://${req.get('host')}${urlFor(endpoint, values)}`;
}

function loginRequired(req, res, next) {
  if (!req.session.admin_authenticated) {
    flash(req, 'Please log in as admin to continue.', 'error');
    return res.redirect(urlFor('admin_access', { target: req.endpoint }));
  }
  return next();
}

const wrapAsync = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (err) {
    next(err);
  }
};

/**
 * Thin wrapper around an Express app that registers named routes.
 *   route.get('home', '/', handler)
 *   route.post('admin_events_add', '/admin/events/add', { auth: true, multipart: true }, handler)
 */
function createRouter(app, { upload }) {
  function add(method, endpoint, pattern, optsOrHandler, maybeHandler) {
    const opts = typeof optsOrHandler === 'function' ? {} : optsOrHandler;
    const handler = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler;

    endpoints.set(endpoint, pattern);
    const chain = [
      (req, res, next) => { req.endpoint = endpoint; next(); },
      ...(opts.auth ? [loginRequired] : []),            // check auth before parsing uploads
      ...(opts.multipart ? [upload.any()] : []),
      wrapAsync(handler),
    ];
    app[method](pattern, ...chain);
  }
  return {
    get: (...args) => add('get', ...args),
    post: (...args) => add('post', ...args),
  };
}

module.exports = { urlFor, templateUrlFor, externalUrlFor, createRouter, loginRequired, endpoints };
