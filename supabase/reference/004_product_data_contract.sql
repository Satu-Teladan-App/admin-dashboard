BEGIN;

-- A legacy trigger may already award points on INSERT. Stop for review rather
-- than deploying a second award path without knowing the existing behavior.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid IN ('public.contribution'::regclass, 'public.scoreboard'::regclass)
      AND NOT t.tgisinternal) THEN
    RAISE EXCEPTION 'Review contribution/scoreboard triggers before installing the atomic reward RPC';
  END IF;
END;
$$;

ALTER TABLE public.contribution
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS activity_type text,
  ADD COLUMN IF NOT EXISTS raw_quantity numeric,
  ADD COLUMN IF NOT EXISTS raw_unit text,
  ADD COLUMN IF NOT EXISTS conversion_rule jsonb,
  ADD COLUMN IF NOT EXISTS activity_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'legacy';
CREATE UNIQUE INDEX IF NOT EXISTS contribution_request_id_unique
  ON public.contribution (request_id) WHERE request_id IS NOT NULL;

-- Stop on duplicates rather than silently deleting historical memberships.
CREATE UNIQUE INDEX IF NOT EXISTS komunitas_member_pair_unique
  ON public.komunitas_member (komunitas_id, alumni_id);

CREATE OR REPLACE FUNCTION public.get_contribution_rankings(
  p_metric text DEFAULT 'energy', p_limit integer DEFAULT 100,
  p_current_user_only boolean DEFAULT false
) RETURNS TABLE (
  rank bigint, alumni_id uuid, name text, avatar text, batch text,
  coin numeric, energy numeric, is_current_user boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_metric NOT IN ('energy', 'coin') OR p_metric IS NULL THEN
    RAISE EXCEPTION 'Invalid ranking metric';
  END IF;
  RETURN QUERY
  WITH ranked AS (
    SELECT rank() OVER (ORDER BY CASE WHEN p_metric = 'energy' THEN s.energy ELSE s.coin END DESC) AS position,
      a.id, coalesce(nullif(a.full_name, ''), a.name) AS display_name,
      a.avatar, a.batch, s.coin, s.energy, a.user_id = auth.uid() AS is_mine
    FROM public.scoreboard s JOIN public.alumni a ON a.id = s.alumni_id AND a.user_id = s.user_id
    WHERE a.consents->'ranking' = 'true'::jsonb
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = a.user_id AND u.deactivated IS TRUE)
  )
  SELECT r.position, r.id, r.display_name, r.avatar, r.batch, r.coin, r.energy, r.is_mine
  FROM ranked r WHERE NOT p_current_user_only OR r.is_mine
  ORDER BY r.position, r.id LIMIT greatest(1, least(coalesce(p_limit, 100), 100));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_ranking_consent(p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_enabled IS NULL THEN RAISE EXCEPTION 'Authentication and choice required' USING ERRCODE = '42501'; END IF;
  UPDATE public.alumni SET consents = jsonb_set(
    CASE WHEN jsonb_typeof(consents) = 'object' THEN consents ELSE '{}'::jsonb END,
    '{ranking}', to_jsonb(p_enabled), true) WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Alumni profile required'; END IF;
  RETURN p_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_contribution_summary()
RETURNS TABLE (coin numeric, energy numeric, contribution_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT coalesce(sum(c.coin_earned), 0), coalesce(sum(c.energy_earned), 0), count(*)
    FROM public.contribution c JOIN public.alumni a ON a.id = c.alumni_id AND a.user_id = c.user_id
    WHERE a.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_challenge_energy(
  p_challenge_id uuid, p_activity_type text, p_quantity numeric,
  p_request_id uuid, p_expected_energy numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_alumni uuid;
  v_challenge public.tantangan%ROWTYPE;
  v_existing public.contribution%ROWTYPE;
  v_type text;
  v_unit text;
  v_divisor numeric := 1;
  v_multiplier numeric := 1;
  v_energy numeric;
  v_claimed numeric;
  v_contribution uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_request_id IS NULL OR p_quantity IS NULL OR p_quantity::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_quantity <= 0 OR p_quantity <> trunc(p_quantity) OR p_quantity > 1000000000 THEN
    RAISE EXCEPTION 'Jumlah aktivitas harus bilangan bulat positif';
  END IF;
  SELECT a.id INTO STRICT v_alumni FROM public.alumni a WHERE a.user_id = v_user FOR UPDATE;
  SELECT * INTO v_existing FROM public.contribution c WHERE c.request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id <> v_user OR v_existing.tantangan_id IS DISTINCT FROM p_challenge_id
       OR v_existing.raw_quantity IS DISTINCT FROM p_quantity
       OR v_existing.activity_type IS DISTINCT FROM p_activity_type THEN
      RAISE EXCEPTION 'Request ID sudah digunakan untuk kontribusi lain';
    END IF;
    RETURN jsonb_build_object('success', true, 'contribution_id', v_existing.id,
      'energyAwarded', v_existing.energy_earned, 'remainingEnergy', v_existing.remaining_energy_to_be_claimed);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.alumni_verification av WHERE av.alumni_id = v_alumni) THEN
    RAISE EXCEPTION 'Akun belum terverifikasi' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = v_user AND u.deactivated IS TRUE)
     OR EXISTS (SELECT 1 FROM public.user_feature_blacklist b
       WHERE (b.user_id = v_user OR b.alumni_id = v_alumni) AND b.feature::text = 'kegiatan'
         AND b.is_active IS TRUE AND (b.blacklisted_until IS NULL OR b.blacklisted_until > now())) THEN
    RAISE EXCEPTION 'Kontribusi kegiatan tidak diizinkan' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT v_challenge FROM public.tantangan t WHERE t.id = p_challenge_id FOR SHARE;
  IF v_challenge.is_active IS NOT TRUE OR v_challenge.kegiatan_id IS NULL
     OR (v_challenge.start_date IS NOT NULL AND now() < v_challenge.start_date)
     OR (v_challenge.end_date IS NOT NULL AND now() > v_challenge.end_date) THEN
    RAISE EXCEPTION 'Tantangan belum dimulai atau sudah berakhir';
  END IF;
  v_type := CASE v_challenge.type WHEN 'transum' THEN 'transportasi_umum'
    WHEN 'tanamPohon' THEN 'tanam_pohon' ELSE v_challenge.type END;
  IF p_activity_type IS DISTINCT FROM v_type THEN RAISE EXCEPTION 'Jenis aktivitas tidak sesuai tantangan'; END IF;
  CASE v_type
    WHEN 'langkah' THEN v_divisor := 100; v_unit := 'langkah';
    WHEN 'kalori' THEN v_divisor := 10; v_unit := 'kalori';
    WHEN 'sampah' THEN v_unit := 'buah';
    WHEN 'transportasi_umum' THEN v_unit := 'kali';
    WHEN 'tanam_pohon' THEN v_unit := 'pohon'; v_multiplier := 10;
    ELSE RAISE EXCEPTION 'Jenis aktivitas tidak didukung';
  END CASE;
  v_energy := floor(p_quantity / v_divisor) * v_multiplier;
  IF v_energy <= 0 OR p_expected_energy IS DISTINCT FROM v_energy THEN
    RAISE EXCEPTION 'Jumlah energi tidak sesuai pratinjau. Periksa kembali aktivitas Anda.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contribution c WHERE c.alumni_id = v_alumni
    AND c.tantangan_id = p_challenge_id AND (c.energy_earned < 0 OR c.user_id <> v_user)) THEN
    RAISE EXCEPTION 'Histori kontribusi tantangan perlu ditinjau admin sebelum klaim berikutnya';
  END IF;
  SELECT coalesce(sum(c.energy_earned), 0) INTO v_claimed FROM public.contribution c
    WHERE c.alumni_id = v_alumni AND c.tantangan_id = p_challenge_id;
  IF v_claimed + v_energy > v_challenge.unit_limit THEN RAISE EXCEPTION 'Batas energi tantangan terlampaui'; END IF;
  INSERT INTO public.contribution(user_id, alumni_id, tantangan_id, coin_earned, energy_earned,
    remaining_energy_to_be_claimed, request_id, activity_type, raw_quantity, raw_unit,
    conversion_rule, activity_snapshot, verification_status)
  VALUES (v_user, v_alumni, p_challenge_id, 0, v_energy,
    v_challenge.unit_limit - v_claimed - v_energy, p_request_id, v_type, p_quantity, v_unit,
    jsonb_build_object('version', 'energy-v1', 'divisor', v_divisor, 'multiplier', v_multiplier),
    jsonb_build_object('name', v_challenge.name, 'type', v_challenge.type, 'kegiatan_id', v_challenge.kegiatan_id),
    'self_reported') RETURNING id INTO v_contribution;
  INSERT INTO public.scoreboard(user_id, alumni_id, coin, energy)
  VALUES (v_user, v_alumni, 0, v_energy)
  ON CONFLICT (user_id) DO UPDATE SET energy = public.scoreboard.energy + excluded.energy, updated_at = now()
  WHERE public.scoreboard.alumni_id = excluded.alumni_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Identitas scoreboard tidak sesuai'; END IF;
  RETURN jsonb_build_object('success', true, 'contribution_id', v_contribution,
    'energyAwarded', v_energy, 'remainingEnergy', v_challenge.unit_limit - v_claimed - v_energy);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_product_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'alumni', jsonb_build_object('total', (SELECT count(*) FROM public.alumni),
      'verified', (SELECT count(DISTINCT alumni_id) FROM public.alumni_verification)),
    'kegiatan', jsonb_build_object('total', (SELECT count(*) FROM public.kegiatan),
      'upcoming', (SELECT count(*) FROM public.kegiatan WHERE kegiatan_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date)),
    'donasi', jsonb_build_object('total', (SELECT count(*) FROM public.donasi),
      'totalAmount', (SELECT coalesce(sum(target_amount), 0) FROM public.donasi)),
    'berita', jsonb_build_object('total', (SELECT count(*) FROM public.berita),
      'thisMonth', (SELECT count(*) FROM public.berita WHERE created_at >=
        (date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'))),
    'komunitas', jsonb_build_object('total', (SELECT count(*) FROM public.komunitas),
      'verified', (SELECT count(DISTINCT komunitas_id) FROM public.komunitas_verification))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_product_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_product_overview() TO authenticated;
REVOKE ALL ON FUNCTION public.get_contribution_rankings(text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_contribution_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_ranking_consent(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_challenge_energy(uuid, text, numeric, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contribution_rankings(text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_contribution_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_ranking_consent(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_challenge_energy(uuid, text, numeric, uuid, numeric) TO authenticated;

-- Client writes bypassing the ledger transaction must no longer award points.
REVOKE INSERT, UPDATE, DELETE ON public.contribution, public.scoreboard FROM authenticated, anon, PUBLIC;
REVOKE SELECT ON public.scoreboard FROM anon;
ALTER TABLE public.scoreboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoreboard_read_consent_guard ON public.scoreboard AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.alumni a WHERE a.id = alumni_id AND a.consents->'ranking' = 'true'::jsonb
  ) OR EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid()));

COMMIT;
