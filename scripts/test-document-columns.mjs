import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();await db.exec('CREATE TABLE public.kegiatan(id integer PRIMARY KEY); CREATE TABLE public.komunitas(id integer PRIMARY KEY); INSERT INTO public.kegiatan VALUES(1);');const sql=readFileSync(new URL('../supabase/migrations/015_activity_community_documents.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
for(const table of ['kegiatan','komunitas']){await db.query(`INSERT INTO public.${table}(id,edaran_url,report_url) VALUES(2,$1,$2)`,['https://drive.google.com/file/d/example/view','https://docs.google.com/document/d/example/edit']);await assert.rejects(db.query(`INSERT INTO public.${table}(id,edaran_url) VALUES(3,$1)`,['https://drive.google.com.evil.test/file/d/a']));await db.exec(`UPDATE public.${table} SET edaran_url=NULL,report_url=NULL WHERE id=2;`);}
assert.equal((await db.query('SELECT id FROM kegiatan WHERE id=1')).rows.length,1);await db.close();console.log('PASS document columns: rerun, existing rows, both tables, valid links, invalid hosts, clearing');
