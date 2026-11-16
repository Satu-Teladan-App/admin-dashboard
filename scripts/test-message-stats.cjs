const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsFixture = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/messageStats.js','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsFixture, Intl, Date });
function client(fail = false) {
  const calls = [];
  return { calls, from(table) {
    const call = { table }; calls.push(call);
    return { select() { return this; }, gte(key, value) { call.gte = [key,value]; return this; }, not(key, operator, value) { call.not = [key,operator,value]; return this; }, then(resolve) { return Promise.resolve({ count: 5, error: fail ? Error('offline') : null }).then(resolve); } };
  } };
}
test('message statistics use actual reports and the WIB day boundary', async () => {
  const db = client();
  const stats = await exportsFixture.getMessageStats(db, new Date('2026-11-15T18:00:00Z'));
  assert.equal(stats.reportedMessages,5);
  assert.deepEqual(db.calls[1].gte, ['created_at','2026-11-15T17:00:00.000Z']);
  assert.equal(db.calls[3].table,'reports');
  assert.deepEqual(db.calls[3].not,['messages_id','is',null]);
});
test('failed statistics are not converted into successful zero counters', async () => {
  await assert.rejects(exportsFixture.getMessageStats(client(true)));
});
