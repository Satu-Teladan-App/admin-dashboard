const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/source-fixture.cjs');
const { permissionForPage, getMenuPermissions } = loadModule('src/lib/adminPagePermissions.js');
test('every operational route maps to its domain permission, including nested routes', () => {
  const expected = { '/alumni': 'manage_users', '/berita':'manage_berita','/kegiatan':'manage_kegiatan','/tantangan':'manage_kegiatan','/komunitas':'manage_komunitas','/kontribusi':'view_analytics','/messages':'moderate_content','/blacklists':'moderate_content','/tickets':'manage_support','/manage-admin':'manage_roles','/admin-roles':'manage_roles','/account-requests':'manage_users' };
  for (const [route, permission] of Object.entries(expected)) {
    assert.equal(permissionForPage(route), permission); assert.equal(permissionForPage(route+'/detail'),permission);
  }
  assert.equal(permissionForPage('/unknown'),'unavailable_page');
});
test('a limited admin sees only granted menu domains',async()=>{
  const calls=[];const allowed=await getMenuPermissions({rpc:async(_name,args)=>{calls.push(args.p_permission);return {data:args.p_permission==='manage_support',error:null};}});
  assert.deepEqual([...allowed],['manage_support']);assert.equal(calls.includes('manage_donasi'),false);
});
test('permission query failures never expose a permissive navigation menu',async()=>{
  await assert.rejects(getMenuPermissions({rpc:async()=>({data:null,error:Error('offline')})}));
});
