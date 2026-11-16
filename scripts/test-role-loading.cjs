const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handlers}=require('./helpers/source-fixture.cjs');
for(const failure of ['join','details','incomplete',null])test(`role load ${failure||'success'} never publishes incomplete permission assignments`,async()=>{
 const calls=[]; const supabase={from(table){const result=table==='roles'?{data:[{id:1}]}:table==='role_permissions'?failure==='join'?{error:Error('denied')}:{data:[{permission_id:2}]}:failure==='details'?{error:Error('denied')}:{data:failure==='incomplete'?[]:[{id:2,name:'manage_users'}]};const q={select:()=>q,order:()=>q,eq:()=>q,in:()=>q,then:(resolve,reject)=>Promise.resolve(result).then(resolve,reject)};return q;}};
 await handlers('app/(dashboard)/admin-roles/page.js',['fetchRoles'],{supabase,setRoles:v=>calls.push(['roles',v]),setLoading:()=>{},toast:{error:v=>calls.push(['error',v])}}).fetchRoles();
 assert.equal(calls.some(c=>c[0]==='roles'),failure===null);assert.equal(calls.some(c=>c[0]==='error'),failure!==null);
});
