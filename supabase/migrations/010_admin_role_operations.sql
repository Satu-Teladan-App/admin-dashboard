BEGIN;

CREATE OR REPLACE FUNCTION public.admin_save_role(p_id bigint,p_name text,p_description text,p_permissions bigint[])
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result bigint; permission_id bigint;
BEGIN
  IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Tidak memiliki izin mengelola role' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('satu-admin-roles',0));
  IF nullif(btrim(p_name),'') IS NULL OR length(p_name)>100 THEN RAISE EXCEPTION 'Nama role tidak valid'; END IF;
  IF p_permissions IS NULL OR array_position(p_permissions,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Pilihan izin tidak valid'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_permissions) i WHERE NOT EXISTS(SELECT 1 FROM public.permissions p WHERE p.id=i)) THEN RAISE EXCEPTION 'Salah satu izin tidak ditemukan'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.roles(name,description) VALUES(btrim(p_name),p_description) RETURNING id INTO result;
  ELSE
    UPDATE public.roles SET name=btrim(p_name),description=p_description WHERE id=p_id RETURNING id INTO result;
    IF NOT FOUND THEN RAISE EXCEPTION 'Role tidak ditemukan'; END IF;
    DELETE FROM public.role_permissions WHERE role_id=p_id;
  END IF;
  FOR permission_id IN SELECT DISTINCT unnest(p_permissions) LOOP
    INSERT INTO public.role_permissions(role_id,permission_id) VALUES(result,permission_id);
  END LOOP;
  IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Perubahan ini akan menghilangkan akses pengelolaan Anda sendiri'; END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_role(p_id bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result bigint;
BEGIN
  IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Tidak memiliki izin mengelola role' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('satu-admin-roles',0));
  IF EXISTS(SELECT 1 FROM public.admin_roles WHERE role_id=p_id) THEN RAISE EXCEPTION 'Role masih digunakan oleh admin'; END IF;
  DELETE FROM public.role_permissions WHERE role_id=p_id;
  DELETE FROM public.roles WHERE id=p_id RETURNING id INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Role tidak ditemukan'; END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_membership(p_user_id uuid,p_role_id bigint,p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Tidak memiliki izin mengelola admin' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('satu-admin-roles',0));
  IF p_enabled IS NULL OR NOT EXISTS(SELECT 1 FROM public.roles WHERE id=p_role_id) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Akun atau role tidak valid'; END IF;
  IF p_enabled THEN
    INSERT INTO public.admin_roles(user_id,role_id) VALUES(p_user_id,p_role_id) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.admin_roles WHERE user_id=p_user_id AND role_id=p_role_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Penugasan role tidak ditemukan'; END IF;
    IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Tidak dapat menghapus akses pengelolaan Anda sendiri'; END IF;
  END IF;
  RETURN p_enabled;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_permission(p_id bigint,p_name text,p_description text,p_delete boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result bigint;
BEGIN
  IF NOT public.app_admin_allowed('manage_roles') THEN RAISE EXCEPTION 'Tidak memiliki izin mengelola permission' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('satu-admin-roles',0));
  IF p_delete THEN
    IF EXISTS(SELECT 1 FROM public.role_permissions WHERE permission_id=p_id) THEN RAISE EXCEPTION 'Permission masih digunakan oleh role'; END IF;
    DELETE FROM public.permissions WHERE id=p_id RETURNING id INTO result;
    IF NOT FOUND THEN RAISE EXCEPTION 'Permission tidak ditemukan'; END IF;
  ELSE
    IF p_id IS NOT NULL OR p_name IS NULL OR length(p_name)<3 OR length(p_name)>64
      OR p_name !~ '^[a-z][a-z0-9_]*(:[a-z][a-z0-9_]*)?$' THEN RAISE EXCEPTION 'Nama permission tidak valid'; END IF;
    INSERT INTO public.permissions(name,description) VALUES(p_name,p_description) RETURNING id INTO result;
  END IF;
  RETURN result;
END $$;

REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES ON public.roles,public.permissions,public.role_permissions,public.admin_roles FROM PUBLIC,anon,authenticated;
DO $$ DECLARE f regprocedure;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.admin_save_role(bigint,text,text,bigint[])'::regprocedure,
    'public.admin_delete_role(bigint)'::regprocedure,'public.admin_set_membership(uuid,bigint,boolean)'::regprocedure,
    'public.admin_save_permission(bigint,text,text,boolean)'::regprocedure] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f);
  END LOOP;
END $$;
COMMIT;
