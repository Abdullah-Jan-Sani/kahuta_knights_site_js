'use strict';

/** Flask-style flash(): queue a message in the signed session cookie. */
function flash(req, message, category = 'message') {
  const queue = Array.isArray(req.session.flashes) ? req.session.flashes.slice() : [];
  queue.push([category, String(message)]);
  req.session.flashes = queue;
}

/** Flask-style get_flashed_messages(): pop once per request, cached for repeat calls. */
function getFlashedMessages(req, withCategories = false) {
  if (!req._flashes) {
    req._flashes = Array.isArray(req.session.flashes) ? req.session.flashes : [];
    if (req._flashes.length) req.session.flashes = [];
  }
  return withCategories ? req._flashes : req._flashes.map(([, message]) => message);
}

module.exports = { flash, getFlashedMessages };
