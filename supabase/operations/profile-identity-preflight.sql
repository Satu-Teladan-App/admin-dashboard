-- Read-only metadata inspection before 007. Review results; this is not an apply script.
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('alumni','alumni_private')
  AND column_name IN ('id','user_id','name','full_name','avatar','consents','batch','batch_status','graduation_year')
ORDER BY table_name,ordinal_position;

SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,t.tgname,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('alumni','alumni_private') AND NOT t.tgisinternal
ORDER BY c.relname,t.tgname;

SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('profile_identity_role','profile_identity_legacy',
  'sync_profile_identity','get_profile_contribution_rankings')
ORDER BY p.proname;

SELECT to_regclass('public.profile_identity_review') AS existing_review;
SELECT schemaname,tablename,policyname,roles,cmd
FROM pg_policies WHERE schemaname='public' AND tablename IN ('alumni','alumni_private');
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('alumni','alumni_private') ORDER BY table_name,grantee;
