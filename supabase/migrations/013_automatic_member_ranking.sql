-- All members participate, including members without a scoreboard row.
-- Scores and existing profile consent metadata are not rewritten.
BEGIN;
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
COMMIT;
