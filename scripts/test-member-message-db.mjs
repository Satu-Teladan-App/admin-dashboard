import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const uid = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const aid = n => `20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks = 0;
async function check(name, run) { await run(); checks++; console.log('PASS '+name); }
async function as(n, sql, args=[]) {
  await db.exec('BEGIN; SET LOCAL ROLE authenticated;');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[n ? uid(n) : '']);
    const r=await db.query(sql,args);await db.exec('COMMIT');return r.rows;
  } catch(e) { await db.exec('ROLLBACK');throw e; }
}
try {
  await db.exec(`
    CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,verified boolean DEFAULT true,banned boolean DEFAULT false);
    CREATE TABLE public.alumni(id uuid PRIMARY KEY,user_id uuid UNIQUE REFERENCES auth.users(id));
    CREATE TABLE public.admin_roles(user_id uuid,role_id bigint);
    CREATE TABLE public.messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sender uuid DEFAULT auth.uid() REFERENCES auth.users(id),sender_alumni_id uuid REFERENCES public.alumni(id),receiver_alumni_id uuid REFERENCES public.alumni(id),message text,created_at timestamptz DEFAULT now(),archived_at timestamptz);
    CREATE FUNCTION public.app_admin_allowed(text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid()='${uid(4)}'::uuid $$;
    CREATE FUNCTION public.fixture_can_send() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT coalesce((SELECT verified AND NOT banned FROM auth.users WHERE id=auth.uid()),false) $$;
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.messages TO authenticated;
    CREATE POLICY member_read ON public.messages FOR SELECT TO authenticated USING(sender=auth.uid() OR public.app_admin_allowed('moderate_content'));
    CREATE POLICY member_send ON public.messages FOR INSERT TO authenticated WITH CHECK(sender=auth.uid() AND public.fixture_can_send());
    CREATE POLICY member_edit ON public.messages FOR UPDATE TO authenticated USING((sender=auth.uid() AND public.fixture_can_send()) OR public.app_admin_allowed('moderate_content')) WITH CHECK((sender=auth.uid() AND public.fixture_can_send()) OR public.app_admin_allowed('moderate_content'));
    CREATE POLICY member_delete ON public.messages FOR DELETE TO authenticated USING((sender=auth.uid() AND public.fixture_can_send()) OR public.app_admin_allowed('moderate_content'));
  `);
  for(let n=1;n<=6;n++) {
    await db.query('INSERT INTO auth.users(id,verified,banned) VALUES($1,$2,$3)',[uid(n),n!==5,n===6]);
    await db.query('INSERT INTO public.alumni VALUES($1,$2)',[aid(n),uid(n)]);
  }
  await db.query('INSERT INTO public.admin_roles VALUES($1,2),($2,1)',[uid(2),uid(4)]);
  const old = await readFile(new URL('../supabase/migrations/011_admin_action_guards.sql',import.meta.url),'utf8');
  await db.exec(old.slice(old.indexOf('CREATE OR REPLACE FUNCTION'),old.indexOf('\nDO $$')));
  await db.exec("CREATE TRIGGER app_admin_domain_guard BEFORE INSERT OR UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_domain_permission('moderate_content');");
  const insert='INSERT INTO public.messages(sender_alumni_id,receiver_alumni_id,message) VALUES($1,$2,$3) RETURNING id';
  await check('reproduces unrelated admin role incorrectly blocking its own DM under 011',async()=>{
    await assert.rejects(as(2,insert,[aid(2),aid(1),'before repair']),/Tidak memiliki izin/);
  });
  await db.exec(await readFile(new URL('../supabase/migrations/014_member_message_permissions.sql',import.meta.url),'utf8'));
  let own;
  await check('ordinary member and unrelated admin role can send their own verified DMs',async()=>{
    await as(1,insert,[aid(1),aid(2),'member message']);
    own=(await as(2,insert,[aid(2),aid(1),'admin as member']))[0].id;
  });
  await check('sender profile impersonation is denied even with a valid auth sender',async()=>{
    await assert.rejects(as(2,insert,[aid(1),aid(2),'forged profile']),/Pengirim pesan/);
    await assert.rejects(as(4,insert,[aid(1),aid(2),'forged moderator profile']),/Pengirim pesan/);
  });
  await check('explicit auth sender impersonation is denied',async()=>{
    await assert.rejects(as(2,'INSERT INTO public.messages(sender,sender_alumni_id,receiver_alumni_id,message) VALUES($1,$2,$3,$4)',[uid(1),aid(2),aid(1),'forged auth']),/Pengirim pesan|row-level security/);
  });
  await check('existing verification and message-blacklist RLS remain effective',async()=>{
    for(const n of [5,6]) await assert.rejects(as(n,insert,[aid(n),aid(1),'blocked']),/row-level security/);
  });
  await check('owners may edit text but cannot move recipients or change archive state',async()=>{
    await as(2,'UPDATE public.messages SET message=$1 WHERE id=$2',['edited',own]);
    await assert.rejects(as(2,'UPDATE public.messages SET receiver_alumni_id=$1 WHERE id=$2',[aid(3),own]),/Tidak memiliki izin/);
    await assert.rejects(as(2,'UPDATE public.messages SET archived_at=now() WHERE id=$1',[own]),/Tidak memiliki izin/);
    await assert.rejects(as(2,'UPDATE public.messages SET created_at=now()+interval \'1 day\' WHERE id=$1',[own]),/Tidak memiliki izin/);
  });
  await check('new messages cannot forge an initial archive state',async()=>{
    await assert.rejects(as(2,'INSERT INTO public.messages(sender_alumni_id,receiver_alumni_id,message,archived_at) VALUES($1,$2,$3,now())',[aid(2),aid(1),'hidden']),/langsung diarsipkan/);
  });
  await check('nonparticipants cannot modify or delete another sender message',async()=>{
    assert.equal((await as(3,'UPDATE public.messages SET message=$1 WHERE id=$2 RETURNING id',['intrusion',own])).length,0);
    assert.equal((await as(3,'DELETE FROM public.messages WHERE id=$1 RETURNING id',[own])).length,0);
  });
  await check('moderation archive remains available and owners retain RLS deletion rights',async()=>{
    await as(4,'UPDATE public.messages SET archived_at=now() WHERE id=$1',[own]);
    assert.equal((await as(2,'DELETE FROM public.messages WHERE id=$1 RETURNING id',[own])).length,1);
  });
  await check('missing-session insert is still denied by RLS',async()=>{
    await assert.rejects(as(null,insert,[aid(1),aid(2),'anonymous']),/row-level security/);
  });
  console.log(JSON.stringify({checks,passed:checks,fixture:true,live_database_modified:false}));
} finally { await db.close(); }
