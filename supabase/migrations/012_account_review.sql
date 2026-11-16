BEGIN;

CREATE OR REPLACE FUNCTION public.admin_request_account_review(p_alumni_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid; result uuid;
BEGIN
  IF NOT public.app_admin_allowed('manage_users') THEN RAISE EXCEPTION 'Tidak memiliki izin meninjau akun' USING ERRCODE='42501'; END IF;
  SELECT user_id INTO owner_id FROM public.alumni WHERE id=p_alumni_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil tidak ditemukan'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  SELECT id INTO result FROM public.account_deletion_requests WHERE user_id=owner_id AND status IN ('pending','approved','processing') ORDER BY requested_at DESC LIMIT 1;
  IF result IS NULL THEN
    INSERT INTO public.account_deletion_requests(user_id,status,reason,metadata)
    VALUES(owner_id,'pending','Peninjauan penghapusan diajukan melalui dashboard admin.',jsonb_build_object('source','admin','requested_by',auth.uid())) RETURNING id INTO result;
  END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_review_account_request(p_id uuid,p_status text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
  IF NOT public.app_admin_allowed('manage_users') THEN RAISE EXCEPTION 'Tidak memiliki izin meninjau akun' USING ERRCODE='42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('approved','rejected') OR nullif(btrim(p_reason),'') IS NULL OR length(p_reason)>2000 THEN RAISE EXCEPTION 'Keputusan dan alasan peninjauan wajib diisi'; END IF;
  UPDATE public.account_deletion_requests SET status=p_status,processed_by=auth.uid(),processed_at=now(),updated_at=now(),
    metadata=jsonb_set(CASE WHEN jsonb_typeof(metadata)='object' THEN metadata ELSE '{}'::jsonb END,'{review_reason}',to_jsonb(btrim(p_reason)),true)
    WHERE id=p_id AND status='pending' RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Permintaan tidak ditemukan atau sudah diproses'; END IF;
  RETURN result;
END $$;

CREATE POLICY app_account_review_admin_read ON public.account_deletion_requests FOR SELECT TO authenticated USING(public.app_admin_allowed('manage_users'));
GRANT SELECT ON public.account_deletion_requests TO authenticated;
REVOKE UPDATE,DELETE ON public.account_deletion_requests FROM PUBLIC,anon,authenticated;
REVOKE DELETE ON public.alumni,public.alumni_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_request_account_review(uuid),public.admin_review_account_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_request_account_review(uuid),public.admin_review_account_request(uuid,text,text) TO authenticated;
COMMIT;
