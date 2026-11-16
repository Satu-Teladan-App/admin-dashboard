const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('../node_modules/typescript');
function jar() {
  const values = new Map();
  return { getAll: () => [...values.values()], set(name, value, options) { if (typeof name === 'object') values.set(name.name, name); else values.set(name, { name, value, ...options }); } };
}
function response(url = null) { return { url, cookies: jar() }; }
function middleware({ user, role = true }) {
  const exports = {};
  const createServerClient = (_url, _key, { cookies }) => ({
    auth: { getUser: async () => { cookies.setAll([{ name: 'fixture-session', value: 'refreshed', options: { httpOnly: true } }]); return { data: { user }, error: null }; } },
    from: () => ({ select() { return this; }, eq() { return this; }, limit() { return Promise.resolve({ data: role ? [{ role_id: 1 }] : [], error: null }); }, then(resolve) { return Promise.resolve({ data: role ? [{ role_id: 1 }] : [], error: null }).then(resolve); } }),
  });
  const code = ts.transpileModule(fs.readFileSync('middleware.js','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, process: { env: {} }, require(name) {
    if (name === '@supabase/ssr') return { createServerClient };
    if (name === 'next/server') return { NextResponse: { next: () => response(), redirect: url => response(String(url)) } };
    if (name === 'next/headers') return { cookies: () => jar() };
    if (name === '@/utils/supabase/server') return { createClient: () => createServerClient('', '', { cookies: { setAll() {} } }) };
    throw Error(name);
  } });
  return exports.middleware;
}
for (const [name, user, role, page, target] of [
  ['member of admin team', { id: 'admin' }, true, '/overview', null],
  ['expired session redirects', null, false, '/overview', '/sign-in'],
  ['signed-in admin redirects from login', { id: 'admin' }, true, '/sign-in', '/overview'],
  ['ordinary member cannot enter admin', { id: 'member' }, false, '/overview', '/sign-in'],
]) test(`${name} preserves refreshed cookies on the returned response`, async () => {
  const request = { url: 'http://fixture.test' + page, nextUrl: { pathname: page }, headers: {}, cookies: jar() };
  const result = await middleware({ user, role })(request);
  assert.equal(result.cookies.getAll().some(c => c.name === 'fixture-session' && c.value === 'refreshed'), true);
  if (target) assert.equal(new URL(result.url).pathname, target);
  else assert.equal(result.url, null);
});
