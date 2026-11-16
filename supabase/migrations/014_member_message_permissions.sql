BEGIN;
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
