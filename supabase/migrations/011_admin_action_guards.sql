BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_admin_domain_permission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE needed text:=TG_ARGV[0]; feature_name text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_TABLE_NAME='user_feature_blacklist' THEN
      IF TG_OP='UPDATE' AND (NEW.feature IS DISTINCT FROM OLD.feature OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.alumni_id IS DISTINCT FROM OLD.alumni_id OR NEW.blacklisted_by IS DISTINCT FROM OLD.blacklisted_by) THEN
        RAISE EXCEPTION 'Identitas pemblokiran tidak dapat dipindahkan. Buat catatan baru untuk koreksi.';
      END IF;
      IF TG_OP='DELETE' THEN feature_name:=OLD.feature::text; ELSE feature_name:=NEW.feature::text; END IF;
      needed:=CASE feature_name WHEN 'alumni' THEN 'manage_users' WHEN 'berita' THEN 'manage_berita'
        WHEN 'kegiatan' THEN 'manage_kegiatan' WHEN 'komunitas' THEN 'manage_komunitas'
        WHEN 'donasi' THEN 'manage_donasi' ELSE 'moderate_content' END;
    END IF;
    IF (TG_TABLE_NAME IN ('alumni_verification','komunitas_verification','kegiatan_verification','donasi_verification','user_feature_blacklist')
      OR EXISTS(SELECT 1 FROM public.admin_roles WHERE user_id=auth.uid()))
      AND NOT public.app_admin_allowed(needed) THEN
      RAISE EXCEPTION 'Tidak memiliki izin untuk tindakan ini' USING ERRCODE='42501';
    END IF;
    IF TG_OP='INSERT' AND TG_TABLE_NAME IN ('alumni_verification','komunitas_verification','kegiatan_verification','donasi_verification') THEN
      NEW.verificator_id:=auth.uid();
    ELSIF TG_OP='INSERT' AND TG_TABLE_NAME='user_feature_blacklist' THEN
      NEW.blacklisted_by:=auth.uid();
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_admin_domain_permission() FROM PUBLIC,anon,authenticated;

DO $$ DECLARE row record;
BEGIN
  FOR row IN SELECT * FROM (VALUES
    ('berita','manage_berita'),('kegiatan','manage_kegiatan'),('tantangan','manage_kegiatan'),
    ('komunitas','manage_komunitas'),('donasi','manage_donasi'),('messages','moderate_content'),
    ('alumni_verification','manage_users'),('komunitas_verification','manage_komunitas'),
    ('kegiatan_verification','manage_kegiatan'),('donasi_verification','manage_donasi'),
    ('user_feature_blacklist','moderate_content')
  ) mapping(table_name,permission_name) LOOP
    EXECUTE format('CREATE TRIGGER app_admin_domain_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_domain_permission(%L)',row.table_name,row.permission_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_verify_entity(p_entity text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE needed text; parent uuid; verification_id text;
BEGIN
  needed:=CASE p_entity WHEN 'alumni' THEN 'manage_users' WHEN 'berita' THEN NULL
    WHEN 'kegiatan' THEN 'manage_kegiatan' WHEN 'komunitas' THEN 'manage_komunitas' WHEN 'donasi' THEN 'manage_donasi' END;
  IF needed IS NULL OR NOT public.app_admin_allowed(needed) THEN RAISE EXCEPTION 'Tidak memiliki izin melakukan verifikasi' USING ERRCODE='42501'; END IF;
  EXECUTE format('SELECT id FROM public.%I WHERE id=$1 %s FOR UPDATE',p_entity,
    CASE WHEN p_entity='alumni' THEN '' ELSE 'AND archived_at IS NULL' END) INTO parent USING p_id;
  IF parent IS NULL THEN RAISE EXCEPTION 'Data tidak ditemukan atau sudah diarsipkan'; END IF;
  EXECUTE format('SELECT id::text FROM public.%I WHERE %I=$1 ORDER BY created_at,id LIMIT 1',p_entity||'_verification',p_entity||'_id') INTO verification_id USING p_id;
  IF verification_id IS NOT NULL THEN RETURN jsonb_build_object('id',verification_id,'already_verified',true); END IF;
  EXECUTE format('INSERT INTO public.%I(%I,verificator_id) VALUES($1,$2) RETURNING id::text',p_entity||'_verification',p_entity||'_id') INTO verification_id USING p_id,auth.uid();
  RETURN jsonb_build_object('id',verification_id,'already_verified',false);
END $$;
REVOKE ALL ON FUNCTION public.admin_verify_entity(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_verify_entity(text,uuid) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.alumni_verification,public.komunitas_verification,public.kegiatan_verification,public.donasi_verification FROM PUBLIC,anon,authenticated;

COMMIT;
