const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadModule, handlers } = require('./helpers/source-fixture.cjs');
const operations = loadModule('src/lib/adminOperations.js');
const content = [
 ['src/modules/berita/BeritaTable.js','handleDeleteBerita'],
 ['src/modules/kegiatan/KegiatanTable.js','handleDeleteKegiatan'],
 ['src/modules/komunitas/KomunitasTable.js','handleDeleteKomunitas'],
 ['src/modules/tantangan/TantanganTable.js','handleDeleteTantangan'],
 ['src/modules/pesan/PesanTable.js','handleDeleteMessage'],
 ['src/modules/alumni/AlumniTable.js','handleDeleteAlumni'],
 ['app/(dashboard)/admin-roles/page.js','deleteRole'],
 ['app/(dashboard)/manage-admin/page.jsx','removeAdmin'],
];
const verification = [
 ['src/modules/kegiatan/KegiatanTable.js','handleVerifyKegiatan'],
 ['src/modules/komunitas/KomunitasTable.js','handleVerifyKomunitas'],
 ['src/modules/alumni/AlumniTable.js','handleVerifyAlumni'],
];
function fixture({ fail=false, cancel=false, silent=false }={}) {
 const calls=[];
 const supabase = { auth:{getUser:async()=>({data:{user:{id:'admin-a'}},error:null})}, rpc:async(name,args)=>{
  calls.push(['rpc',name,args]);return {data:fail?null:silent?null:{id:args.p_id||args.p_alumni_id||'created',archived:true},error:fail?{code:'42501',message:'denied'}:null};
 },from(table){let mutation=false;const q={select(){return q;},eq(){return q;},update(){mutation=true;return q;},insert(){mutation=true;return q;},single:async()=>{if(!mutation)return {data:null,error:{code:'PGRST116'}};calls.push(['row',table]);return {data:silent?null:{id:'fixture-row'},error:fail?{code:'42501'}:null};}};return q;} };
 const context={...operations,supabase,client:supabase,confirm:()=>!cancel,toast:{success:value=>calls.push(['success',value]),error:value=>calls.push(['error',value])},
  setShowBlacklistDialog:()=>{},setBlacklistReason:()=>{},setUserToBlacklist:()=>{},blacklistReason:'Reason',userToBlacklist:{id:'profile-a',user_id:'auth-a'},
  setIsAddDialogOpen:()=>{},setSelectedAlumni:()=>{},setSelectedRole:()=>{},selectedAlumni:'auth-a',selectedRole:'2',
  newRole:{name:'Role',description:'Description'},selectedPermissions:[1],editingRole:{id:1,name:'Role',description:'Description'},setIsCreateDialogOpen:()=>{},setNewRole:()=>{},setSelectedPermissions:()=>{},setIsEditDialogOpen:()=>{},setEditingRole:()=>{},
  onRefresh:()=>calls.push(['refresh'])
 };
 for(const name of ['fetchBerita','fetchKegiatan','fetchKomunitas','fetchTantangan','fetchMessages','fetchAlumni','fetchAdmins','fetchRoles','fetchBlacklist','fetchPermissions'])context[name]=()=>calls.push(['refresh']);
 return {context,calls};
}
for(const [file,name] of content)for(const mode of ['success','denied','cancelled'])test(`${name}: ${mode} result matches the actual operation`,async()=>{
 const f=fixture({fail:mode==='denied',cancel:mode==='cancelled'});await handlers(file,[name],f.context)[name]('entity-a',1);
 assert.equal(f.calls.some(c=>c[0]==='success'),mode==='success');assert.equal(f.calls.some(c=>c[0]==='rpc'),mode!=='cancelled');if(mode==='denied')assert.equal(f.calls.some(c=>c[0]==='error'),true);
});
for(const [file,name] of verification)for(const fail of [false,true])test(`${name}: ${fail?'permission denial':'authorized verification'}`,async()=>{
 const f=fixture({fail});await handlers(file,[name],f.context)[name]('entity-a');assert.equal(f.calls.some(c=>c[0]==='success'),!fail);assert.equal(f.calls.find(c=>c[0]==='rpc')[1],'admin_verify_entity');
});
for(const [file,name] of [
 ['app/(dashboard)/admin-roles/page.js','createRole'],['app/(dashboard)/admin-roles/page.js','updateRole'],['app/(dashboard)/manage-admin/page.jsx','addAdmin'],
])for(const fail of [false,true])test(`${name}: ${fail?'failure preserves editing state':'confirmed success'}`,async()=>{
 const f=fixture({fail});await handlers(file,[name],f.context)[name]();assert.equal(f.calls.some(c=>c[0]==='success'),!fail);assert.equal(f.calls.some(c=>c[0]==='error'),fail);
});
for(const [file,name,args] of [
 ['src/modules/tantangan/TantanganTable.js','handleToggleActive',['entity-a',true]],
 ['app/(dashboard)/blacklists/page.js','handleRemoveFromBlacklist',['entity-a']],
 ...['alumni','berita','kegiatan','komunitas','pesan'].map(domain=>[`src/modules/${domain}/${{alumni:'Alumni',berita:'Berita',kegiatan:'Kegiatan',komunitas:'Komunitas',pesan:'Pesan'}[domain]}Table.js`,'handleBlacklistUser',[]]),
])for(const mode of ['success','denied','silent'])test(`${file} ${name}: ${mode}`,async()=>{
 const f=fixture({fail:mode==='denied',silent:mode==='silent'});await handlers(file,[name],f.context)[name](...args);assert.equal(f.calls.some(c=>c[0]==='success'),mode==='success');
});
