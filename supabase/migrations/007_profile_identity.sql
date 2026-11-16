BEGIN;

-- Replace only the legacy status copier reviewed from the live preflight.
-- Keep its function for any other callers; the transaction restores triggers on failure.
DO $takeover$
DECLARE
  target regclass;
  old_trigger record;
  reviewed_body text := $reviewed$
    BEGIN
      IF NEW.batch IS NOT NULL AND NEW.batch LIKE '% - %' THEN
        NEW.batch_status := TRIM(SPLIT_PART(NEW.batch, ' - ', 1));
      ELSE
        NEW.batch_status := NEW.batch_status;
      END IF;
      RETURN NEW;
    END;
  $reviewed$;
BEGIN
  FOREACH target IN ARRAY ARRAY['public.alumni'::regclass, 'public.alumni_private'::regclass] LOOP
    FOR old_trigger IN
      SELECT t.tgname,t.tgfoid,t.tgtype,t.tgqual,p.prosrc
      FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      WHERE t.tgrelid=target AND t.tgname='trg_sync_batch_status' AND NOT t.tgisinternal
    LOOP
      IF old_trigger.tgfoid IS DISTINCT FROM to_regprocedure('public.sync_batch_status()')::oid
        OR old_trigger.tgtype<>23 OR old_trigger.tgqual IS NOT NULL
        OR lower(regexp_replace(regexp_replace(old_trigger.prosrc, '--[^\r\n]*', '', 'g'), '\s+', '', 'g'))
          <>lower(regexp_replace(reviewed_body, '\s+', '', 'g')) THEN
        RAISE EXCEPTION 'Legacy batch trigger on % differs from reviewed preflight; inspect before applying 007',target;
      END IF;
      EXECUTE format('DROP TRIGGER %I ON %s',old_trigger.tgname,target);
    END LOOP;
  END LOOP;
END;
$takeover$;

CREATE FUNCTION public.profile_identity_role(p_value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE lower(btrim(p_value))
    WHEN 'alumni' THEN 'alumni' WHEN 'alumnus' THEN 'alumni'
    WHEN 'aktif' THEN 'aktif' WHEN 'siswa aktif' THEN 'aktif' WHEN 'siswa_aktif' THEN 'aktif'
    WHEN 'active' THEN 'aktif' WHEN 'aktif siswa' THEN 'aktif'
    WHEN 'guru' THEN 'guru' WHEN 'teacher' THEN 'guru' END;
$$;

CREATE FUNCTION public.profile_identity_legacy(p_batch text)
RETURNS TABLE(role text, graduation_year integer)
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT public.profile_identity_role(parts[1]), parts[2]::integer
  FROM (SELECT regexp_match(btrim(p_batch),
    '^(alumni|alumnus|aktif|siswa aktif|siswa_aktif|active|aktif siswa|guru|teacher)(?:\s*-\s*(\d{4}))?$', 'i') AS parts) parsed;
$$;

-- Backfill only missing/unambiguous values. Never infer a graduation year from a bare number.
DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['alumni', 'alumni_private'] LOOP
    EXECUTE format($backfill$
      WITH candidates AS (
        SELECT a.id, coalesce(public.profile_identity_role(a.batch_status), legacy.role) AS role,
          coalesce(a.graduation_year, legacy.graduation_year) AS year
        FROM public.%I a CROSS JOIN LATERAL public.profile_identity_legacy(a.batch) legacy
        WHERE (nullif(btrim(a.batch_status), '') IS NULL OR public.profile_identity_role(a.batch_status) IS NOT NULL)
          AND (legacy.role IS NULL OR public.profile_identity_role(a.batch_status) IS NULL OR legacy.role=public.profile_identity_role(a.batch_status))
          AND (a.graduation_year IS NULL OR legacy.graduation_year IS NULL OR a.graduation_year=legacy.graduation_year)
      )
      UPDATE public.%I a SET batch_status=c.role, graduation_year=c.year
      FROM candidates c WHERE a.id=c.id AND c.role IS NOT NULL
        AND (c.year BETWEEN 1900 AND extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer+12 OR (c.role='guru' AND c.year IS NULL))
        AND (c.role<>'alumni' OR c.year<=extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer)
        AND (c.role<>'aktif' OR c.year>=extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer)
        AND (a.batch_status IS DISTINCT FROM c.role OR a.graduation_year IS DISTINCT FROM c.year)
    $backfill$, target, target);
  END LOOP;
END;
$$;

CREATE FUNCTION public.sync_profile_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_role text; v_year integer; legacy record;
  current_year integer := extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer;
  canonical_changed boolean;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.batch_status IS NOT DISTINCT FROM OLD.batch_status
      AND NEW.graduation_year IS NOT DISTINCT FROM OLD.graduation_year
      AND NEW.batch IS NOT DISTINCT FROM OLD.batch THEN RETURN NEW; END IF;
    canonical_changed := NEW.batch_status IS DISTINCT FROM OLD.batch_status
      OR NEW.graduation_year IS DISTINCT FROM OLD.graduation_year;
  ELSE
    canonical_changed := nullif(btrim(NEW.batch_status), '') IS NOT NULL;
  END IF;

  IF canonical_changed THEN
    v_role := public.profile_identity_role(NEW.batch_status);
    v_year := NEW.graduation_year;
  ELSE
    -- Old clients submit only batch, including when canonical fields already exist.
    SELECT * INTO legacy FROM public.profile_identity_legacy(NEW.batch);
    v_role := legacy.role;
    v_year := legacy.graduation_year;
    -- On insert a separately supplied year must agree with the legacy payload.
    IF TG_OP='INSERT' AND NEW.graduation_year IS NOT NULL THEN
      IF v_year IS NOT NULL AND v_year<>NEW.graduation_year THEN RAISE EXCEPTION 'Conflicting profile year'; END IF;
      v_year := NEW.graduation_year;
    END IF;
  END IF;

  IF v_role IS NULL THEN RAISE EXCEPTION 'Choose alumni, aktif or guru'; END IF;
  IF v_year IS NULL AND v_role<>'guru' THEN RAISE EXCEPTION 'Graduation year is required'; END IF;
  IF v_year IS NOT NULL AND (v_year<1900 OR v_year>current_year+12) THEN RAISE EXCEPTION 'Invalid graduation year'; END IF;
  IF v_role='alumni' AND v_year>current_year THEN RAISE EXCEPTION 'Alumni graduation cannot be in the future'; END IF;
  IF v_role='aktif' AND v_year<current_year THEN RAISE EXCEPTION 'Student expected graduation cannot be in the past'; END IF;

  NEW.batch_status := v_role;
  NEW.graduation_year := v_year;
  NEW.batch := CASE v_role WHEN 'alumni' THEN 'Alumni' WHEN 'aktif' THEN 'Aktif' ELSE 'Guru' END
    || CASE WHEN v_year IS NULL THEN '' ELSE ' - '||v_year END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_identity BEFORE INSERT OR UPDATE OF batch, batch_status, graduation_year
ON public.alumni FOR EACH ROW EXECUTE FUNCTION public.sync_profile_identity();
CREATE TRIGGER sync_profile_identity BEFORE INSERT OR UPDATE OF batch, batch_status, graduation_year
ON public.alumni_private FOR EACH ROW EXECUTE FUNCTION public.sync_profile_identity();

-- Versioned result preserves the existing ranking RPC contract for installed clients.
CREATE FUNCTION public.get_profile_contribution_rankings(
  p_metric text DEFAULT 'energy', p_limit integer DEFAULT 100, p_current_user_only boolean DEFAULT false
) RETURNS TABLE(rank bigint, alumni_id uuid, name text, avatar text, batch_status text,
  graduation_year integer, coin numeric, energy numeric, is_current_user boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_metric IS NULL OR p_metric NOT IN ('energy','coin') THEN RAISE EXCEPTION 'Invalid ranking metric'; END IF;
  RETURN QUERY WITH ranked AS (
    SELECT rank() OVER (ORDER BY CASE WHEN p_metric='energy' THEN s.energy ELSE s.coin END DESC) AS position,
      a.id,coalesce(nullif(a.full_name,''),a.name) AS display_name,a.avatar,a.batch_status,a.graduation_year,
      s.coin,s.energy,a.user_id=auth.uid() AS is_mine
    FROM public.scoreboard s JOIN public.alumni a ON a.id=s.alumni_id AND a.user_id=s.user_id
    WHERE a.consents->'ranking'='true'::jsonb
      AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.user_id=a.user_id AND u.deactivated IS TRUE)
  ) SELECT r.position,r.id,r.display_name,r.avatar,r.batch_status,r.graduation_year,r.coin,r.energy,r.is_mine
    FROM ranked r WHERE NOT p_current_user_only OR r.is_mine
    ORDER BY r.position,r.id LIMIT greatest(1,least(coalesce(p_limit,100),100));
END;
$$;
REVOKE ALL ON FUNCTION public.get_profile_contribution_rankings(text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_profile_contribution_rankings(text,integer,boolean) TO authenticated;

-- Owner-only operational report: no names, contact details or raw profile contents.
CREATE VIEW public.profile_identity_review AS
WITH profiles AS (
  SELECT 'alumni'::text AS source_table,id,batch,batch_status,graduation_year FROM public.alumni
  UNION ALL
  SELECT 'alumni_private',id,batch,batch_status,graduation_year FROM public.alumni_private
), inspected AS (
  SELECT a.source_table,a.id,
    CASE
      WHEN nullif(btrim(a.batch_status), '') IS NOT NULL AND public.profile_identity_role(a.batch_status) IS NULL THEN 'unknown_status'
      WHEN nullif(btrim(a.batch), '') IS NOT NULL AND legacy.role IS NULL THEN 'ambiguous_legacy_batch'
      WHEN public.profile_identity_role(a.batch_status) IS NOT NULL AND legacy.role IS NOT NULL
        AND public.profile_identity_role(a.batch_status)<>legacy.role THEN 'conflicting_status'
      WHEN a.graduation_year IS NOT NULL AND legacy.graduation_year IS NOT NULL AND a.graduation_year<>legacy.graduation_year THEN 'conflicting_year'
      WHEN public.profile_identity_role(a.batch_status) IS NULL THEN 'missing_status'
      WHEN a.graduation_year IS NULL AND public.profile_identity_role(a.batch_status)<>'guru' THEN 'missing_year'
      WHEN a.graduation_year<1900 OR a.graduation_year>extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer+12 THEN 'invalid_year'
      WHEN public.profile_identity_role(a.batch_status)='alumni' AND a.graduation_year>extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer THEN 'future_alumni_year'
      WHEN public.profile_identity_role(a.batch_status)='aktif' AND a.graduation_year<extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::integer THEN 'outdated_student_status'
    END AS reason
  FROM profiles a CROSS JOIN LATERAL public.profile_identity_legacy(a.batch) legacy
)
SELECT source_table,id,reason FROM inspected WHERE reason IS NOT NULL;

REVOKE ALL ON public.profile_identity_review FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.profile_identity_review TO service_role;
REVOKE ALL ON FUNCTION public.profile_identity_role(text),public.profile_identity_legacy(text),public.sync_profile_identity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.profile_identity_role(text),public.profile_identity_legacy(text),public.sync_profile_identity() TO authenticated,service_role;
COMMIT;
