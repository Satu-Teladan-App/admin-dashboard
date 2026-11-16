-- Apply this file once after the app/admin package (008–012).
-- Restores member DMs and includes all active members in rankings.
-- Does not reset scores, modify consents, or apply migration 004.
BEGIN;
-- Source: 013_automatic_member_ranking.sql
-- SHA256: 1c8184b735954093b5a743b32b4114b2383ebc1da6c850e1ea3b3a27be2ff88d
-- All members participate, including members without a scoreboard row.
-- Scores and existing profile consent metadata are not rewritten.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.get_profile_contribution_rankings(
  p_metric text DEFAULT 'energy', p_limit integer DEFAULT 100,
  p_current_user_only boolean DEFAULT false
) RETURNS TABLE (
  rank bigint, alumni_id uuid, name text, avatar text, batch_status text,
  graduation_year integer, coin numeric, energy numeric, is_current_user boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_metric IS NULL OR p_metric NOT IN ('energy', 'coin') THEN
    RAISE EXCEPTION 'Invalid ranking metric' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT a.id, coalesce(nullif(trim(a.full_name), ''), a.name) AS display_name,
      a.avatar, a.batch_status, a.graduation_year,
      coalesce(s.coin, 0::numeric) AS member_coin,
      coalesce(s.energy, 0::numeric) AS member_energy,
      a.user_id = auth.uid() AS is_mine
    FROM public.alumni a
    LEFT JOIN public.scoreboard s ON s.alumni_id = a.id AND s.user_id = a.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.user_id = a.user_id AND u.deactivated IS TRUE
    )
  ), ranked AS (
    SELECT rank() OVER (
      ORDER BY CASE WHEN p_metric = 'energy' THEN m.member_energy ELSE m.member_coin END DESC
    ) AS position, m.*
    FROM members m
  )
  SELECT r.position, r.id, r.display_name, r.avatar, r.batch_status,
    r.graduation_year, r.member_coin, r.member_energy, r.is_mine
  FROM ranked r
  WHERE NOT coalesce(p_current_user_only, false) OR r.is_mine
  ORDER BY r.position, r.id
  LIMIT greatest(1, least(coalesce(p_limit, 100), 100));
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_contribution_rankings(text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_contribution_rankings(text, integer, boolean) TO authenticated, service_role;

-- Source: 014_member_message_permissions.sql
-- SHA256: 2ffaa402a15d463a558bc5167326d811fe74486d2fc6949bb4c332555c63c621
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- A member may send their own DM even when they also hold an unrelated admin role.
-- Existing message RLS still enforces verification and feature restrictions.
CREATE OR REPLACE FUNCTION public.enforce_member_message_permission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.sender IS DISTINCT FROM actor OR NOT EXISTS (
      SELECT 1 FROM public.alumni a WHERE a.id = NEW.sender_alumni_id AND a.user_id = actor
    ) THEN
      RAISE EXCEPTION 'Pengirim pesan harus sesuai dengan akun Anda' USING ERRCODE = '42501';
    END IF;
    IF NEW.archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'Pesan baru tidak dapat langsung diarsipkan' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF public.app_admin_allowed('moderate_content') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF OLD.sender = actor AND EXISTS (
    SELECT 1 FROM public.alumni a WHERE a.id = OLD.sender_alumni_id AND a.user_id = actor
  ) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF (to_jsonb(NEW) - 'message') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'message') THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Tidak memiliki izin untuk tindakan ini' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_member_message_permission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS app_admin_domain_guard ON public.messages;
CREATE TRIGGER app_admin_domain_guard BEFORE INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_member_message_permission();
COMMIT;
