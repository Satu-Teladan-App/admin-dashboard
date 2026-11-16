const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/adminOperations.js'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(output, { exports: exportsObject });

test('zero-row archive responses never produce a successful result', async () => {
  await assert.rejects(exportsObject.archiveContent({ rpc: async () => ({ data: {}, error: null }) }, 'berita', 'news-a'), /terkonfirmasi/);
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'admin_archive_content'); assert.equal(args.p_table, 'berita');
    return { data: { id: args.p_id, archived: true }, error: null };
  } };
  assert.equal((await exportsObject.archiveContent(client, 'berita', 'news-a')).archived, true);
});
test('ticket and reply operations reject unconfirmed success', async () => {
  const client = { rpc: async () => ({ data: { id: 'different' }, error: null }) };
  await assert.rejects(exportsObject.updateTicket(client, 'ticket-a', { status: 'resolved' }), /terkonfirmasi/);
  await assert.rejects(exportsObject.sendAdminReply(client, 'ticket-a', 'Reply', 'request'), /terkonfirmasi/);
});
test('an idempotent reply forwards a stable request ID without trusting an admin flag', async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'send_admin_chat_message'); assert.equal(args.p_request_id, 'same-request');
    assert.equal(Object.hasOwn(args, 'is_admin_reply'), false);
    return { data: { ticket_id: 'ticket-a' }, error: null };
  } };
  await exportsObject.sendAdminReply(client, 'ticket-a', ' Reply ', 'same-request');
});
test('membership removal accepts false as confirmation, but rejects missing data', async () => {
  assert.equal(await exportsObject.confirmedAdminRpc({ rpc: async () => ({ data: false }) }, 'admin_set_membership', {}), false);
  await assert.rejects(exportsObject.confirmedAdminRpc({ rpc: async () => ({ data: null }) }, 'admin_set_membership', {}), /terkonfirmasi/);
});
test('permission and dependency errors remain visible to the operator', async () => {
  for (const code of ['42501', '23503', 'PGRST202']) {
    await assert.rejects(exportsObject.archiveContent({ rpc: async () => ({ error: { code } }) }, 'berita', 'news-a'));
  }
});
