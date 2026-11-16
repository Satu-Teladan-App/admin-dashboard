BEGIN;

CREATE TABLE public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL REFERENCES auth.users(id),
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_action_log FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_action_log TO authenticated;
CREATE POLICY admin_action_read ON public.admin_action_log FOR SELECT TO authenticated
USING(public.app_admin_allowed('moderate_content'));

DO $$ DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['berita','kegiatan','komunitas','donasi','tantangan','messages'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN archived_at timestamptz',target);
    -- Restrictive policies also protect old clients that do not filter archived_at.
    EXECUTE format('CREATE POLICY app_hide_archived ON public.%I AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (archived_at IS NULL)',target);
    IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=format('public.%I',target)::regclass) THEN
      IF target='tantangan' THEN
        ALTER TABLE public.tantangan ENABLE ROW LEVEL SECURITY;
        CREATE POLICY app_challenge_read ON public.tantangan FOR SELECT TO authenticated USING(true);
        CREATE POLICY app_challenge_public_read ON public.tantangan FOR SELECT TO anon USING(is_active IS TRUE);
        CREATE POLICY app_challenge_manage ON public.tantangan FOR ALL TO authenticated
          USING(public.app_admin_allowed('manage_kegiatan')) WITH CHECK(public.app_admin_allowed('manage_kegiatan'));
      ELSE
        RAISE EXCEPTION 'Review RLS before archiving table %',target;
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_archive_content(p_table text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE needed text; found_id uuid;
BEGIN
  needed:=CASE p_table WHEN 'berita' THEN 'manage_berita' WHEN 'kegiatan' THEN 'manage_kegiatan'
    WHEN 'komunitas' THEN 'manage_komunitas' WHEN 'donasi' THEN 'manage_donasi'
    WHEN 'tantangan' THEN 'manage_kegiatan' WHEN 'messages' THEN 'moderate_content' END;
  IF needed IS NULL OR NOT public.app_admin_allowed(needed) THEN
    RAISE EXCEPTION 'Tidak memiliki izin mengarsipkan konten' USING ERRCODE='42501'; END IF;
  IF p_table='donasi' AND EXISTS(SELECT 1 FROM public.transactions WHERE donation_id=p_id AND status IN ('pending','authorize')) THEN
    RAISE EXCEPTION 'Masih ada pembayaran berjalan. Selesaikan pemeriksaan transaksi terlebih dahulu.'; END IF;
  EXECUTE format('UPDATE public.%I SET archived_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id',p_table) INTO found_id USING p_id;
  IF found_id IS NULL THEN RAISE EXCEPTION 'Konten tidak ditemukan atau sudah diarsipkan'; END IF;
  IF p_table='tantangan' THEN UPDATE public.tantangan SET is_active=false WHERE id=p_id; END IF;
  IF p_table='kegiatan' THEN UPDATE public.tantangan SET is_active=false WHERE kegiatan_id=p_id; END IF;
  INSERT INTO public.admin_action_log(actor,entity_table,entity_id,action) VALUES(auth.uid(),p_table,p_id,'archive');
  RETURN jsonb_build_object('id',found_id,'archived',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_archive_content(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_content(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_product_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE month_start timestamptz:=date_trunc('month',now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
BEGIN
  IF NOT public.app_admin_allowed('view_analytics') THEN RAISE EXCEPTION 'Tidak memiliki izin melihat statistik' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'alumni',jsonb_build_object('total',(SELECT count(*) FROM public.alumni),
      'verified',(SELECT count(*) FROM public.alumni_verification)),
    'kegiatan',jsonb_build_object('total',(SELECT count(*) FROM public.kegiatan WHERE archived_at IS NULL),
      'upcoming',(SELECT count(*) FROM public.kegiatan WHERE archived_at IS NULL AND kegiatan_date>=(now() AT TIME ZONE 'Asia/Jakarta')::date)),
    'donasi',jsonb_build_object('total',(SELECT count(*) FROM public.donasi WHERE archived_at IS NULL),
      'totalAmount',(SELECT coalesce(sum(target_amount),0) FROM public.donasi WHERE archived_at IS NULL)),
    'berita',jsonb_build_object('total',(SELECT count(*) FROM public.berita WHERE archived_at IS NULL),
      'thisMonth',(SELECT count(*) FROM public.berita WHERE archived_at IS NULL AND created_at>=month_start)),
    'komunitas',jsonb_build_object('total',(SELECT count(*) FROM public.komunitas WHERE archived_at IS NULL),
      'verified',(SELECT count(DISTINCT v.komunitas_id) FROM public.komunitas_verification v JOIN public.komunitas k ON k.id=v.komunitas_id WHERE k.archived_at IS NULL))
  );
END $$;
REVOKE ALL ON FUNCTION public.get_admin_product_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_product_overview() TO authenticated;

COMMIT;
