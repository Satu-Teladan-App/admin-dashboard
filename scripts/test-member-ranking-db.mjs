import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const uid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const aid = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
async function check(name, run) { await run(); console.log('PASS ' + name); checks++; }
async function rankings(user, metric = 'energy', limit = 100, own = false) {
  await db.exec('BEGIN; SET LOCAL ROLE authenticated;');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user || '']);
    const result = await db.query('SELECT * FROM public.get_profile_contribution_rankings($1,$2,$3)', [metric, limit, own]);
    await db.exec('COMMIT'); return result.rows;
  } catch (error) { await db.exec('ROLLBACK'); throw error; }
}
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.alumni(id uuid PRIMARY KEY,user_id uuid UNIQUE,name text,full_name text,avatar text,batch_status text,graduation_year integer,consents jsonb);
    CREATE TABLE public.scoreboard(alumni_id uuid UNIQUE,user_id uuid UNIQUE,coin numeric,energy numeric);
    CREATE TABLE public.users(user_id uuid,deactivated boolean);
    ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.scoreboard ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION public.get_profile_contribution_rankings(text DEFAULT 'energy',integer DEFAULT 100,boolean DEFAULT false)
      RETURNS TABLE(rank bigint,alumni_id uuid,name text,avatar text,batch_status text,graduation_year integer,coin numeric,energy numeric,is_current_user boolean)
      LANGUAGE sql AS $$ SELECT NULL::bigint,NULL::uuid,NULL::text,NULL::text,NULL::text,NULL::integer,NULL::numeric,NULL::numeric,NULL::boolean WHERE false $$;
  `);
  for (let n = 1; n <= 6; n++) {
    await db.query("INSERT INTO public.alumni VALUES($1,$2,$3,NULL,NULL,'alumni',2024,$4)", [aid(n), uid(n), `Member ${n}`, JSON.stringify(n === 1 ? { ranking: true } : n === 2 ? {} : { ranking: false })]);
  }
  await db.query('INSERT INTO public.scoreboard VALUES($1,$2,1,30),($3,$4,50,10),($5,$6,999,999),($7,$8,700,700)', [aid(1),uid(1),aid(2),uid(2),aid(4),uid(4),aid(5),uid(6)]);
  await db.query('INSERT INTO public.users VALUES($1,true)', [uid(4)]);
  const before = (await db.query('SELECT * FROM public.scoreboard ORDER BY alumni_id')).rows;
  await db.exec(await readFile(new URL('../supabase/migrations/013_automatic_member_ranking.sql', import.meta.url), 'utf8'));
  await check('all active members participate regardless of historical consent', async () => {
    const rows = await rankings(uid(1));
    assert.equal(rows.length, 5);
    assert(rows.some(r => r.alumni_id === aid(2)));
    assert(rows.some(r => r.alumni_id === aid(3)));
    assert(!rows.some(r => r.alumni_id === aid(4)));
  });
  await check('members without a scoreboard receive zero without a write', async () => {
    const row = (await rankings(uid(3), 'energy', 100, true))[0];
    assert.equal(Number(row.energy), 0); assert.equal(Number(row.coin), 0);
    assert.deepEqual((await db.query('SELECT * FROM public.scoreboard ORDER BY alumni_id')).rows, before);
  });
  await check('mismatched Auth/profile scoreboard pairs expose neither balance', async () => {
    const rows = await rankings(uid(1));
    for (const n of [5,6]) assert.equal(Number(rows.find(r => r.alumni_id === aid(n)).energy), 0);
  });
  await check('energy and coin have independent order and equal values share rank', async () => {
    const energy = await rankings(uid(2)); const coin = await rankings(uid(2), 'coin');
    assert.equal(energy[0].alumni_id, aid(1)); assert.equal(coin[0].alumni_id, aid(2));
    assert.equal(Number(energy[2].rank), 3); assert.equal(Number(energy[3].rank), 3);
  });
  await check('own rank is computed before filtering and respects the selected metric', async () => {
    assert.equal(Number((await rankings(uid(2), 'energy', 1, true))[0].rank), 2);
    assert.equal(Number((await rankings(uid(2), 'coin', 1, true))[0].rank), 1);
  });
  await check('ties have stable order and requests have bounded limits', async () => {
    assert.equal((await rankings(uid(1), 'energy', 0)).length, 1);
    const a = await rankings(uid(1)); const b = await rankings(uid(1));
    assert.deepEqual(a.map(r => r.alumni_id), b.map(r => r.alumni_id));
  });
  await check('anonymous and missing-session access are denied; invalid metrics fail', async () => {
    await assert.rejects(rankings(null), /Authentication required/);
    await assert.rejects(rankings(uid(1), 'combined'), /Invalid ranking metric/);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.get_profile_contribution_rankings(text,integer,boolean)','EXECUTE') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.alumni','SELECT') AS allowed")).rows[0].allowed, false);
  });
  await check('historical consent metadata is not rewritten', async () => {
    assert.deepEqual((await db.query('SELECT consents FROM public.alumni WHERE id=$1', [aid(3)])).rows[0].consents, { ranking: false });
  });
  console.log(JSON.stringify({ checks, passed: checks, fixture: true, live_database_modified: false }));
} finally { await db.close(); }
