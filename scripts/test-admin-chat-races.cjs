const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handlers}=require('./helpers/source-fixture.cjs');
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function fixture(){
 const pending=deferred(),calls=[];
 const selectedRef={current:'ticket-a'};
 const context={selected:{id:'ticket-a'},selectedRef,busy:false,draft:'Reply',request:{current:'request-a'},client:{},crypto:{randomUUID:()=> 'request-a'},
  setBusy:v=>calls.push(['busy',v]),setError:v=>calls.push(['error',v]),setNotice:v=>calls.push(['notice',v]),setDraft:v=>calls.push(['draft',v]),setSelected:v=>calls.push(['selected',v]),
  updateTicket:()=>pending.promise,sendAdminReply:()=>pending.promise,load:async()=>calls.push(['load']),loadThread:async id=>calls.push(['thread',id]),
 };
 return {pending,calls,selectedRef,context};
}
test('a delayed ticket update cannot overwrite the newly selected conversation',async()=>{
 const f=fixture();const api=handlers('src/modules/tickets/AdminTickets.jsx',['mutate'],f.context);const task=api.mutate({priority:'high'});f.selectedRef.current='ticket-b';f.pending.resolve({id:'ticket-a',priority:'high'});await task;assert.equal(f.calls.some(c=>c[0]==='selected'),false);
});
test('a delayed reply cannot clear the draft or reload the wrong conversation after switching tickets',async()=>{
 const f=fixture();const api=handlers('src/modules/tickets/AdminTickets.jsx',['send'],f.context);const task=api.send();f.selectedRef.current='ticket-b';f.context.request.current='request-b';f.pending.resolve({ticket_id:'ticket-a'});await task;assert.equal(f.calls.some(c=>c[0]==='draft'),false);assert.equal(f.calls.some(c=>c[0]==='thread'&&c[1]==='ticket-a'),false);assert.equal(f.context.request.current,'request-b');
});
for(const stale of [false,true])test(`thread failure ${stale?'from an old conversation is ignored':'in the selected conversation is surfaced'}`,async()=>{const pending=deferred();const selectedRef={current:'ticket-a'};const api=handlers('src/modules/tickets/AdminTickets.jsx',['loadThread'],{useCallback:fn=>fn,generation:{current:0},threadOffset:{current:0},selectedRef,client:{rpc:()=>pending.promise}});const task=api.loadThread('ticket-a');if(stale)selectedRef.current='ticket-b';pending.resolve({error:Error('offline')});if(stale)await task;else await assert.rejects(task,/Percakapan/);});
test('a loaded thread marks only its own last received timestamp as read',async()=>{const calls=[];const selectedRef={current:'ticket-a'};const api=handlers('src/modules/tickets/AdminTickets.jsx',['loadThread'],{useCallback:fn=>fn,generation:{current:0},threadOffset:{current:0},selectedRef,setMessages:()=>{},setThreadMore:()=>{},setSelected:()=>{},client:{rpc:async(name,args)=>{calls.push([name,args]);return name==='get_support_thread'?{data:{ticket:{id:'ticket-a',created_at:'2026-11-16T00:00:00Z'},messages:[{created_at:'2026-11-16T01:00:00Z'}],has_more:false}}:{data:true};}}});await api.loadThread('ticket-a');assert.equal(calls[1][0],'mark_support_thread_read');assert.equal(calls[1][1].p_ticket_id,'ticket-a');assert.equal(calls[1][1].p_through,'2026-11-16T01:00:00Z');});
