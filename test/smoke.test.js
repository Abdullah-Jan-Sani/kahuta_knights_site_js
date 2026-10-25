'use strict';
// Boots the real Express app on a random port and exercises read-only pages + the admin login flow.
// Run with:  npm test      (needs `npm install` first)
const assert = require('assert');
process.env.ADMIN_PASSWORD = 'test-password';
process.env.SECRET_KEY = 'test-secret';

const { createApp } = require('../src/app');

const fakeMailer = { send: async () => {} };

(async () => {
  const server = createApp({ mailer: fakeMailer }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, headers = {}) => fetch(base + path, { redirect: 'manual', headers });
  let passed = 0;
  const ok = (name) => { passed++; console.log(`  ok  ${name}`); };

  try {
    for (const path of ['/', '/events', '/rankings', '/team', '/contact', '/register', '/register-event']) {
      const res = await get(path);
      assert.strictEqual(res.status, 200, `${path} -> ${res.status}`);
      assert.match(await res.text(), /Kahuta Knights/i);
      ok(`GET ${path}`);
    }

    const css = await get('/static/css/style.css');
    assert.strictEqual(css.status, 200);
    ok('static css served');

    const missing = await get('/definitely-not-a-page');
    assert.strictEqual(missing.status, 404);
    ok('404 for unknown route');

    const guarded = await get('/admin/rankings');
    assert.strictEqual(guarded.status, 302);
    assert.strictEqual(guarded.headers.get('location'), '/admin/access?target=admin_rankings');
    ok('admin pages redirect to login when logged out');

    const bad = await fetch(`${base}/admin/access`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong&target=rankings',
    });
    assert.strictEqual(bad.status, 200);
    assert.match(await bad.text(), /Incorrect password/);
    ok('wrong password rejected');

    const login = await fetch(`${base}/admin/access`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'password=test-password&target=rankings',
    });
    assert.strictEqual(login.status, 302);
    assert.strictEqual(login.headers.get('location'), '/admin/rankings');
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    ok('correct password logs in');

    for (const path of ['/admin/rankings', '/admin/events', '/admin/team_registration', '/admin/event_registration']) {
      const res = await get(path, { cookie });
      assert.strictEqual(res.status, 200, `${path} -> ${res.status}`);
      ok(`GET ${path} (admin)`);
    }
  } finally {
    server.close();
  }
  console.log(`\n${passed} checks passed`);
})().catch((err) => { console.error('\nSMOKE TEST FAILED:', err); process.exit(1); });
