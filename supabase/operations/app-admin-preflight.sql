-- Read-only. No user names, messages, tokens or secret values are returned.
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('support_tickets','ticket_replies','account_deletion_requests')
ORDER BY table_name,ordinal_position;

SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('berita','kegiatan','komunitas','donasi','tantangan','messages','account_deletion_requests');

SELECT t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t
WHERE t.tgrelid='public.ticket_replies'::regclass AND NOT t.tgisinternal;

SELECT p.name,count(DISTINCT ar.user_id) AS assigned_admin_accounts FROM public.permissions p
LEFT JOIN public.role_permissions rp ON rp.permission_id=p.id
LEFT JOIN public.admin_roles ar ON ar.role_id=rp.role_id GROUP BY p.name ORDER BY p.name;

SELECT to_regprocedure('public.app_admin_allowed(text)') AS already_installed,
  to_regprocedure('public.claim_challenge_energy(uuid,text,numeric,uuid,numeric)') AS reward_rpc;
