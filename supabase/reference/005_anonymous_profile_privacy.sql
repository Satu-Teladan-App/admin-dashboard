BEGIN;

-- This closes direct anonymous reads found by A01. Review views, RPCs and
-- authenticated field-level consent separately before claiming full privacy.
REVOKE SELECT ON public.alumni, public.alumni_private, public.users FROM anon, PUBLIC;

-- Column grants can survive revoking a table-level grant.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name, grantee
    FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name IN ('alumni', 'alumni_private', 'users')
      AND grantee IN ('anon', 'PUBLIC') AND privilege_type = 'SELECT'
  LOOP
    EXECUTE format('REVOKE SELECT (%I) ON public.%I FROM %s', r.column_name, r.table_name,
      CASE WHEN r.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(r.grantee) END);
  END LOOP;
END;
$$;

COMMIT;
