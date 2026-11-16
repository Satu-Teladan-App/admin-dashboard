import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, cp, symlink, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(root, '..');
const temp = await mkdtemp(join(tmpdir(), 'satu-admin-ui-'));
const adminId = '10000000-0000-4000-8000-000000000003';
const ownerId = '10000000-0000-4000-8000-000000000001';
const profileId = '10000000-0000-4000-8000-000000000006';
const adminProfileId = '10000000-0000-4000-8000-000000000007';
const ticketId = '20000000-0000-4000-8000-000000000001';
const newsId = '20000000-0000-4000-8000-000000000002';
const created = '2026-11-12T10:00:00.000Z';
const apiPort = 3055;
const appPort = 3056;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const appUrl = `http://127.0.0.1:${appPort}`;
const actor = { id: adminId, aud: 'authenticated', role: 'authenticated', email: 'admin@example.invalid', created_at: created, app_metadata: {}, user_metadata: {} };
const state = {
  allowed: true, notes: '', replies: [], archive: false,
  ticket: { id: ticketId, user_id: ownerId, subject: 'Pertanyaan fixture', message: 'Bagaimana cara memperbaiki biodata?', status: 'pending', priority: 'normal', created_at: created, updated_at: created, resolved_at: null },
  news: { id: newsId, title: 'Berita fixture', writer: adminId, writer_alumni_id: profileId, category: 'Alumni', description: 'Isi berita uji', publication_date: null, created_at: created, updated_at: created, berita_mentions: [] },
  entities: {
    kegiatan: [{ id: '30000000-0000-4000-8000-000000000001', name: 'Kegiatan fixture', creator: adminId, kegiatan_date: '2027-01-01', created_at: created, kegiatan_verification: [], kegiatan_attendance_list: [] }],
    komunitas: [{ id: '30000000-0000-4000-8000-000000000002', name: 'Komunitas fixture', creator: adminId, created_at: created, komunitas_verification: [], komunitas_member: [] }],
    tantangan: [{ id: '30000000-0000-4000-8000-000000000003', name: 'Tantangan fixture', type: 'langkah', unit_limit: 10, is_active: true, created_at: created, kegiatan: null }],
  },
  permissionError: false, tableReads: [], seen: new Map(), calls: [],
};
const profiles = [{ id: profileId, user_id: ownerId, name: 'Alumni Uji', full_name: 'Alumni Uji', avatar: null, batch_status: 'alumni', graduation_year: 2024 },
  { id: adminProfileId, user_id: adminId, name: 'Admin Uji', full_name: 'Admin Uji', avatar: null, batch_status: 'alumni', graduation_year: 2006 }];
state.roles = [{ id: 1, name: 'Operator fixture', description: 'Fixture only', created_at: created }];
state.permissions = [{ id: 1, name: 'manage_support', description: 'Chat admin', created_at: created }];
state.rolePermissions = [];
state.adminRoles = [{ user_id: adminId, role_id: 1, created_at: created }];
const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,prefer,range,accept-profile,content-profile,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const url = new URL(req.url, apiUrl);
  let body = '';
  for await (const chunk of req) body += chunk;
  const payload = body ? JSON.parse(body) : {};
  let value = [];
  let status = 200;
  if (url.pathname === '/auth/v1/user') value = actor;
  else if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const fn = url.pathname.split('/').at(-1);
    state.calls.push(fn);
    if (fn === 'app_admin_allowed') { if (state.permissionError) { status = 503; value = { message: 'Fixture unavailable', code: 'FIXTURE' }; } else value = state.allowed; }
    else if (fn === 'get_admin_product_overview') value = { alumni: { total: 2, verified: 1 }, kegiatan: { total: 0, upcoming: 0 }, berita: { total: 0, thisMonth: 0 }, komunitas: { total: 0, verified: 0 } };
    else if (fn === 'get_support_thread') value = { ticket: state.ticket, messages: state.replies, has_more: false };
    else if (fn === 'mark_support_thread_read') value = null;
    else if (fn === 'send_admin_chat_message') {
      if (!state.seen.has(payload.p_request_id)) {
        const reply = { id: crypto.randomUUID(), user_id: adminId, message: payload.p_message, is_admin_reply: true, created_at: new Date().toISOString() };
        state.replies.push(reply); state.ticket.status = 'in_progress';
        state.seen.set(payload.p_request_id, { ticket_id: ticketId, reply_id: reply.id });
      }
      value = state.seen.get(payload.p_request_id);
    } else if (fn === 'admin_update_ticket') {
      const values = { ...payload.p_values };
      if ('admin_notes' in values) { state.notes = values.admin_notes; delete values.admin_notes; }
      Object.assign(state.ticket, values);
      value = state.ticket;
    } else if (fn === 'admin_verify_entity') {
      const entity = state.entities[payload.p_entity]?.find(row => row.id === payload.p_id);
      if (entity) entity[payload.p_entity + '_verification'] = [{ id: crypto.randomUUID() }];
      value = { id: payload.p_id };
    } else if (fn === 'admin_archive_content') {
      if (payload.p_table === 'berita') state.archive = true;
      else if (state.entities[payload.p_table]) state.entities[payload.p_table] = state.entities[payload.p_table].filter(row => row.id !== payload.p_id);
      value = { id: payload.p_id, archived: true };
    }
    else if (fn === 'admin_save_role') {
      const id = payload.p_id || Math.max(...state.roles.map(role => role.id), 0) + 1;
      const role = { id, name: payload.p_name, description: payload.p_description, created_at: created };
      state.roles = [...state.roles.filter(item => item.id !== id), role];
      state.rolePermissions = [...state.rolePermissions.filter(item => item.role_id !== id), ...payload.p_permissions.map(permission_id => ({ role_id: id, permission_id }))];
      value = { id };
    } else if (fn === 'admin_delete_role') {
      state.roles = state.roles.filter(item => item.id !== payload.p_id);
      state.rolePermissions = state.rolePermissions.filter(item => item.role_id !== payload.p_id); value = true;
    } else if (fn === 'admin_save_permission') {
      if (payload.p_delete) { state.permissions = state.permissions.filter(item => item.id !== payload.p_id); value = true; }
      else { const id = Math.max(...state.permissions.map(item => item.id), 0) + 1; state.permissions.push({ id, name: payload.p_name, description: payload.p_description, created_at: created }); value = { id }; }
    } else if (fn === 'admin_set_membership') {
      const pair = item => item.user_id === payload.p_user_id && item.role_id === payload.p_role_id;
      state.adminRoles = state.adminRoles.filter(item => !pair(item));
      if (payload.p_enabled) state.adminRoles.push({ user_id: payload.p_user_id, role_id: payload.p_role_id, created_at: created });
      value = payload.p_enabled;
    }
    else { status = 400; value = { message: 'Unimplemented fixture RPC', code: 'FIXTURE' }; }
  } else if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.split('/').at(-1);
    if (req.method === 'GET' || req.method === 'HEAD') state.tableReads.push(table);
    if (state.entities[table]) {
      if (req.method === 'PATCH') {
        const id = url.searchParams.get('id')?.replace('eq.', '');
        const row = state.entities[table].find(row => row.id === id);
        if (row) Object.assign(row, payload);
        value = row ? [row] : [];
      } else value = state.entities[table];
    }
    else if (table === 'admin_roles') value = state.adminRoles;
    else if (table === 'support_tickets') {
      const filter = url.searchParams.get('status');
      value = !filter || filter.includes(state.ticket.status) ? [state.ticket] : [];
    }
    else if (table === 'ticket_internal_notes') value = state.notes ? [{ body: state.notes }] : [];
    else if (table === 'alumni') value = url.searchParams.get('user_id')?.startsWith('eq.')
      ? profiles.filter(profile => 'eq.' + profile.user_id === url.searchParams.get('user_id')) : profiles;
    else if (table === 'berita') {
      if (req.method === 'PATCH') Object.assign(state.news, payload);
      if (req.method === 'POST') {
        if ('auth_uid' in payload) { status = 400; value = { message: 'Unknown writer column' }; }
        else { Object.assign(state.news, payload); state.archive = false; value = [state.news]; }
      } else value = state.archive ? [] : [state.news];
    } else if (table === 'roles') value = state.roles;
    else if (table === 'permissions') {
      const ids = url.searchParams.get('id'); value = ids ? state.permissions.filter(item => ids.includes(String(item.id))) : state.permissions;
    }
    else if (table === 'role_permissions') {
      const id = url.searchParams.get('role_id')?.replace('eq.', ''); value = id ? state.rolePermissions.filter(item => item.role_id === Number(id)) : state.rolePermissions;
    }
    else if (table === 'users') value = profiles.map(profile => ({ id: profile.id, user_id: profile.user_id, email: 'fixture@example.invalid' }));
    else if (table === 'permissions' || table === 'role_permissions' || table === 'reports' || table === 'account_deletion_requests') value = [];
    else value = [];
    if (Array.isArray(value)) {
      res.setHeader('Content-Range', value.length ? `0-${value.length - 1}/${value.length}` : '*/0');
      if (String(req.headers.accept).includes('vnd.pgrst.object+json')) value = value[0] || null;
    }
  } else { status = 404; value = { message: 'No fixture endpoint' }; }
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status).end(req.method === 'HEAD' ? '' : JSON.stringify(value));
});

let server;
let browser;
let serverLog = '';
const results = [];
const screenshotDir = join(projectRoot, 'audit/screens/app-admin');
try {
  for (const dir of ['app', 'src', 'components', 'utils', 'lib', 'hooks', 'public', 'types']) {
    if (existsSync(join(root, dir))) await cp(join(root, dir), join(temp, dir), { recursive: true });
  }
  for (const file of ['next.config.mjs', 'next.config.js', 'postcss.config.mjs', 'postcss.config.js', 'tsconfig.json', 'jsconfig.json', 'next-env.d.ts', 'package.json']) {
    if (existsSync(join(root, file))) await cp(join(root, file), join(temp, file));
  }
  await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir');
  await new Promise(resolve => backend.listen(apiPort, '127.0.0.1', resolve));
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon-key' };
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(appPort)], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverLog = (serverLog + chunk.toString()).slice(-30000); });
  for (let attempt = 0; ; attempt++) {
    try { await fetch(appUrl + '/sign-in', { signal: AbortSignal.timeout(5000) }); break; }
    catch { if (attempt > 90) throw new Error('Fixture Next server did not start'); await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.SATU_TEST_BROWSER_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const encode = object => Buffer.from(JSON.stringify(object)).toString('base64url');
  const jwt = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: adminId, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) + '.fixture';
  const session = { access_token: jwt, refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: actor };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + encode(session), domain: '127.0.0.1', path: '/' }]);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(appUrl + '/tickets');
  await page.getByRole('heading', { name: 'Chat Admin', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Overview', exact: true }).waitFor();
  await page.getByRole('button', { name: /Alumni Uji/ }).click();
  await page.getByText('Bagaimana cara memperbaiki biodata?', { exact: true }).waitFor();
  results.push('open actual admin chat component and load a thread');
  await page.getByLabel('Balasan untuk pengguna').fill('Silakan buka Edit Profil untuk memperbarui biodata.');
  await page.getByRole('button', { name: 'Kirim balasan', exact: true }).click();
  await page.getByText('Balasan terkirim.', { exact: true }).waitFor();
  assert.equal(state.replies.length, 1);
  results.push('send reply through the shared idempotent RPC');
  await page.getByLabel('Catatan internal · hanya dapat dibaca admin berizin').fill('Catatan fixture yang tidak boleh muncul di aplikasi pengguna.');
  await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
  await page.getByText('Perubahan tersimpan.', { exact: true }).waitFor();
  assert.match(state.notes, /Catatan fixture/);
  results.push('save a private admin note');
  await page.getByRole('region', { name: 'Percakapan bantuan' }).getByRole('combobox').first().selectOption('resolved');
  await page.getByText('Perubahan tersimpan.', { exact: true }).waitFor();
  assert.equal(state.ticket.status, 'resolved');
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, 'admin-chat-desktop.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: /Alumni Uji/ }).click();
  await page.getByText('Silakan buka Edit Profil untuk memperbarui biodata.', { exact: true }).waitFor();
  await page.getByLabel('Catatan internal · hanya dapat dibaca admin berizin').waitFor();
  assert.match(await page.getByLabel('Catatan internal · hanya dapat dibaca admin berizin').inputValue(), /Catatan fixture/);
  results.push('reply, status and note survive a page refresh');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(screenshotDir, 'admin-chat-mobile.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false);
  results.push('admin chat reflows at 390px without horizontal document overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(appUrl + '/berita');
  await page.getByText('Berita fixture', { exact: true }).first().waitFor();
  await page.locator('tbody tr').filter({ hasText: 'Berita fixture' }).getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Edit Berita', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title *', { exact: true }).fill('Berita fixture diperbarui');
  await page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
  await page.getByText('Perubahan berita tersimpan', { exact: true }).waitFor();
  assert.equal(state.news.title, 'Berita fixture diperbarui');
  results.push('edit news through its live menu handler and persist the changed title');
  await page.getByRole('button', { name: 'Add Berita', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title *', { exact: true }).fill('Berita fixture baru');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Berita', exact: true }).click();
  await page.getByText('Berita added successfully', { exact: true }).waitFor();
  assert.equal(state.news.writer, adminId);
  assert.equal(state.news.writer_alumni_id, adminProfileId);
  results.push('create news with the real writer column instead of the absent auth_uid column');
  await page.locator('tbody tr').filter({ hasText: 'Berita fixture baru' }).getByRole('button').last().click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('menuitem', { name: 'Verify & Publish', exact: true }).click();
  await page.getByText('Berita verified and published successfully', { exact: true }).waitFor();
  assert.match(state.news.publication_date, /^\d{4}-\d{2}-\d{2}$/);
  results.push('publish news using a WIB calendar date and a confirmed returned row');
  await page.locator('tbody tr').filter({ hasText: 'Berita fixture baru' }).getByRole('button').last().click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('menuitem', { name: /Arsipkan Berita/ }).click();
  await page.getByText('Berita diarsipkan', { exact: true }).waitFor();
  assert.equal(state.archive, true);
  await page.reload();
  await page.getByText('No berita data available', { exact: true }).waitFor();
  assert.equal(await page.getByText('Berita fixture baru', { exact: true }).count(), 0);
  results.push('archive reported content through RPC and verify it stays absent after refresh');
  for (const [domain, title] of [['kegiatan', 'Kegiatan'], ['komunitas', 'Komunitas']]) {
    await page.goto(appUrl + '/' + domain);
    const row = page.locator('tbody tr').filter({ hasText: title + ' fixture' });
    await row.getByRole('button').last().click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('menuitem', { name: 'Verify ' + title, exact: true }).click();
    await page.getByText(title + ' verified successfully', { exact: true }).waitFor();
    assert.equal(state.entities[domain][0][domain + '_verification'].length, 1);
    results.push('verify actual ' + domain + ' table menu through authorized RPC');
    await row.getByRole('button').last().click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('menuitem', { name: 'Arsipkan ' + title, exact: true }).click();
    await page.getByText(title + ' diarsipkan', { exact: true }).waitFor();
    await page.reload();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('tbody tr').filter({ hasText: title + ' fixture' }).count(), 0);
    results.push('archive ' + domain + ' and keep it absent after reload');
  }
  await page.goto(appUrl + '/tantangan');
  let challengeRow = page.locator('tbody tr').filter({ hasText: 'Tantangan fixture' });
  await challengeRow.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Deactivate', exact: true }).click();
  await page.getByText('Tantangan deactivated successfully', { exact: true }).waitFor();
  assert.equal(state.entities.tantangan[0].is_active, false);
  results.push('toggle challenge status through actual menu and confirmed row update');
  await challengeRow.getByRole('button').last().click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('menuitem', { name: 'Arsipkan Tantangan', exact: true }).click();
  await page.getByText('Tantangan diarsipkan', { exact: true }).waitFor();
  assert.equal(state.entities.tantangan.length, 0);
  results.push('archive challenge without deleting its historical contributions');
  await page.goto(appUrl + '/admin-roles');
  await page.getByRole('button', { name: 'Create Role', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Role Name', { exact: true }).fill('Role fixture baru');
  await page.getByRole('dialog').getByLabel('Description', { exact: true }).fill('Fixture role');
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await page.getByRole('dialog').getByRole('button', { name: 'Create Role', exact: true }).click();
  await page.getByText('Role created successfully', { exact: true }).waitFor();
  const newRoleId = state.roles.find(item => item.name === 'Role fixture baru').id;
  assert.equal(state.rolePermissions.some(item => item.role_id === newRoleId && item.permission_id === 1), true);
  results.push('create role and save the chosen permission from the actual dialog');
  let roleRow = page.locator('tbody tr').filter({ hasText: 'Role fixture baru' });
  await roleRow.getByRole('button').first().click();
  await page.getByRole('dialog').getByLabel('Role Name', { exact: true }).fill('Role fixture diperbarui');
  await page.getByRole('dialog').getByRole('button', { name: 'Update Role', exact: true }).click();
  await page.getByText('Role updated successfully', { exact: true }).waitFor();
  assert.equal(state.roles.find(item => item.id === newRoleId).name, 'Role fixture diperbarui');
  results.push('edit a role while preserving its assigned permission');
  await page.goto(appUrl + '/manage-admin');
  await page.getByRole('button', { name: 'Add Admin', exact: true }).click();
  const adminDialog = page.getByRole('dialog');
  await adminDialog.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: 'Admin Uji', exact: true }).click();
  await adminDialog.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Role fixture diperbarui', exact: true }).click();
  await adminDialog.getByRole('button', { name: 'Add Admin', exact: true }).click();
  await page.getByText('Admin added successfully', { exact: true }).waitFor();
  assert.equal(state.adminRoles.filter(item => item.user_id === adminId).length, 2);
  results.push('assign an additional role to an existing admin without dropping the old assignment');
  const membership = page.locator('tbody tr').filter({ hasText: 'Role fixture diperbarui' });
  page.once('dialog', dialog => dialog.accept());
  await membership.getByRole('button').last().click();
  await page.getByText('Admin removed successfully', { exact: true }).waitFor();
  assert.equal(state.adminRoles.filter(item => item.user_id === adminId).length, 1);
  results.push('revoke only the selected admin role while preserving another role');
  await page.goto(appUrl + '/admin-roles');
  roleRow = page.locator('tbody tr').filter({ hasText: 'Role fixture diperbarui' });
  page.once('dialog', dialog => dialog.accept());
  await roleRow.getByRole('button').last().click();
  await page.getByText('Role deleted successfully', { exact: true }).waitFor();
  assert.equal(state.roles.some(item => item.id === newRoleId), false);
  results.push('delete an unassigned role through its confirmed RPC');
  await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
  await page.getByRole('button', { name: 'Create Permission', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Permission Name', { exact: true }).fill('fixture:custom');
  await page.getByRole('dialog').getByRole('button', { name: 'Create Permission', exact: true }).click();
  await page.getByText('Permission created successfully', { exact: true }).waitFor();
  assert.equal(state.permissions.some(item => item.name === 'fixture:custom'), true);
  results.push('create a permission from its actual form');
  const permissionRow = page.locator('tbody tr').filter({ hasText: 'fixture:custom' });
  page.once('dialog', dialog => dialog.accept());
  await permissionRow.getByRole('button').last().click();
  await page.getByText('Permission deleted successfully', { exact: true }).waitFor();
  assert.equal(state.permissions.some(item => item.name === 'fixture:custom'), false);
  results.push('delete the selected permission without affecting other permission records');
  for (const route of ['/overview', '/alumni', '/kegiatan', '/komunitas', '/tantangan', '/kontribusi', '/messages', '/pesan', '/blacklists', '/account-requests', '/manage-admin', '/admin-roles']) {
    await page.goto(appUrl + route);
    await page.locator('main').first().waitFor();
    await page.getByText('Memeriksa izin halaman…', { exact: true }).waitFor({ state: 'hidden' });
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByText('Application error', { exact: false }).count(), 0, route);
    assert.equal(await page.getByRole('link', { name: 'Pendanaan', exact: true }).count(), 0, route);
    results.push('render active admin route with isolated fixtures: ' + route);
  }
  await page.goto(appUrl + '/pendanaan');
  await page.waitForURL(appUrl + '/');
  results.push('disabled funding route redirects before rendering financial UI');
  state.allowed = false;
  await page.goto(appUrl + '/tickets');
  await page.getByText('Akun ini tidak memiliki izin membuka halaman tersebut.', { exact: true }).waitFor();
  results.push('a denied permission hides the operational page');
  for (const route of ['/overview', '/alumni', '/berita', '/kegiatan', '/komunitas', '/tantangan', '/kontribusi', '/messages', '/blacklists', '/account-requests', '/manage-admin', '/admin-roles']) {
    state.tableReads = [];
    await page.goto(appUrl + route);
    await page.getByText('Akun ini tidak memiliki izin membuka halaman tersebut.', { exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    assert.deepEqual(state.tableReads, [], 'denied page must not mount data effects: ' + route);
    results.push('denied admin page never mounts data effects: ' + route);
  }
  state.permissionError = true;
  await page.goto(appUrl + '/admin-roles');
  await page.getByText('Izin belum dapat diperiksa.', { exact: false }).waitFor();
  state.permissionError = false; state.allowed = true;
  await page.getByRole('button', { name: 'Periksa lagi', exact: true }).click();
  await page.getByRole('heading', { name: 'Admin Roles', exact: false }).first().waitFor();
  results.push('failed permission lookup can be retried and then mounts the allowed page');
  assert.deepEqual(errors, []);
  await writeFile(join(projectRoot, 'audit/results/app-admin-browser.json'), JSON.stringify({ fixture: true, checks: results, browser_errors: errors, production_requests_allowed: false, screenshots: ['admin-chat-desktop.png', 'admin-chat-mobile.png'] }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.length, fixture: true, browser_errors: errors.length }));
} catch (error) {
  await mkdir(join(projectRoot, 'audit/logs'), { recursive: true });
  await writeFile(join(projectRoot, 'audit/logs/app-admin-browser.log'), serverLog);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
  await new Promise(resolve => backend.close(resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 4, retryDelay: 300 });
}
