BEGIN;

CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('verification','support','community','news')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verification boolean NOT NULL DEFAULT true,
  support boolean NOT NULL DEFAULT true,
  community boolean NOT NULL DEFAULT true,
  news boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT false,
  quiet_start integer CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end integer CHECK (quiet_end BETWEEN 0 AND 23),
  CHECK ((quiet_start IS NULL) = (quiet_end IS NULL)),
  CHECK (quiet_start IS NULL OR quiet_start <> quiet_end)
);
CREATE TABLE public.notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE(event_id,user_id)
);
CREATE INDEX notification_inbox_user_created ON public.notification_recipients(user_id,created_at DESC,id);
CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY,
  secret_hash bytea NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  token text UNIQUE,
  platform text NOT NULL CHECK(platform IN ('android','ios')),
  environment text NOT NULL CHECK(environment IN ('development','preview','production')),
  project_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(NOT active OR token IS NOT NULL)
);
CREATE TABLE public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.notification_recipients(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL,
  project_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','receipt','delivered','failed','cancelled','unknown')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_id uuid,
  leased_at timestamptz,
  receipt_id text,
  sent_at timestamptz,
  error_code text,
  UNIQUE(recipient_id,device_id)
);
CREATE INDEX push_delivery_due ON public.push_deliveries(status,next_attempt_at);
CREATE INDEX push_delivery_device_recent ON public.push_deliveries(device_id,status,sent_at);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_events,public.notification_recipients,public.notification_preferences,public.push_devices,public.push_deliveries FROM anon,authenticated,PUBLIC;
GRANT ALL ON public.notification_events,public.notification_recipients,public.notification_preferences,public.push_devices,public.push_deliveries TO service_role;
GRANT SELECT ON public.notification_events,public.notification_recipients,public.notification_preferences TO authenticated;
CREATE POLICY own_inbox ON public.notification_recipients FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_preferences ON public.notification_preferences FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY recipient_event ON public.notification_events FOR SELECT TO authenticated USING(EXISTS (
  SELECT 1 FROM public.notification_recipients r WHERE r.event_id=notification_events.id AND r.user_id=auth.uid()
));

CREATE FUNCTION public.set_notification_preferences(p_values jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k NOT IN ('verification','support','community','news','push_enabled','quiet_start','quiet_end') THEN RAISE EXCEPTION 'Invalid preference'; END IF;
    IF k IN ('verification','support','community','news','push_enabled') AND jsonb_typeof(p_values->k) <> 'boolean' THEN RAISE EXCEPTION 'Boolean required'; END IF;
  END LOOP;
  INSERT INTO public.notification_preferences(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  UPDATE public.notification_preferences SET
    verification=coalesce((p_values->>'verification')::boolean,verification),
    support=coalesce((p_values->>'support')::boolean,support),
    community=coalesce((p_values->>'community')::boolean,community),
    news=coalesce((p_values->>'news')::boolean,news),
    push_enabled=coalesce((p_values->>'push_enabled')::boolean,push_enabled),
    quiet_start=CASE WHEN p_values ? 'quiet_start' THEN (p_values->>'quiet_start')::integer ELSE quiet_start END,
    quiet_end=CASE WHEN p_values ? 'quiet_end' THEN (p_values->>'quiet_end')::integer ELSE quiet_end END
  WHERE user_id=auth.uid();
END;
$$;
CREATE FUNCTION public.register_push_device(p_id uuid,p_secret text,p_token text,p_platform text,p_environment text,p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_session uuid := (auth.jwt()->>'session_id')::uuid;
BEGIN
  IF auth.uid() IS NULL OR v_session IS NULL OR length(p_secret)<32 OR length(p_secret)>200
    OR p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' OR length(p_token)>300 THEN
    RAISE EXCEPTION 'Invalid device registration';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=v_session AND s.user_id=auth.uid())
    OR EXISTS(SELECT 1 FROM public.users u WHERE u.user_id=auth.uid() AND u.deactivated IS TRUE) THEN
    RAISE EXCEPTION 'Session is inactive';
  END IF;
  IF EXISTS(SELECT 1 FROM public.push_devices d WHERE d.id=p_id AND d.secret_hash<>sha256(convert_to(p_secret,'UTF8')))
    OR EXISTS(SELECT 1 FROM public.push_devices d WHERE d.token=p_token AND d.id<>p_id AND d.user_id<>auth.uid()) THEN
    RAISE EXCEPTION 'Installation proof does not match';
  END IF;
  -- Reinstall recovery is allowed for the same authenticated owner only.
  -- Retain delivery history, retire the old installation and release its token.
  UPDATE public.push_devices SET active=false,token=NULL,updated_at=now()
    WHERE token=p_token AND id<>p_id AND user_id=auth.uid();
  INSERT INTO public.push_devices(id,secret_hash,user_id,session_id,token,platform,environment,project_id)
    VALUES(p_id,sha256(convert_to(p_secret,'UTF8')),auth.uid(),v_session,p_token,p_platform,p_environment,p_project_id)
  ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,token=excluded.token,
    platform=excluded.platform,environment=excluded.environment,project_id=excluded.project_id,active=true,updated_at=now();
END;
$$;
CREATE FUNCTION public.release_push_device(p_id uuid,p_secret text,p_owner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.push_devices SET active=false,updated_at=now()
    WHERE id=p_id AND user_id=p_owner AND secret_hash=sha256(convert_to(p_secret,'UTF8'));
END;
$$;
CREATE FUNCTION public.mark_notification_read(p_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notification_recipients SET read_at=now() WHERE user_id=auth.uid() AND read_at IS NULL AND (p_id IS NULL OR id=p_id);
END;
$$;

-- Only trusted database transitions can create recipient records and enqueue pushes.
CREATE FUNCTION public.emit_notification(p_key text,p_category text,p_entity uuid,p_title text,p_body text,p_users uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_event uuid;
BEGIN
  INSERT INTO public.notification_events(event_key,category,entity_id,title,body)
    VALUES(p_key,p_category,p_entity,p_title,p_body) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO v_event;
  IF v_event IS NULL THEN RETURN; END IF;
  INSERT INTO public.notification_recipients(event_id,user_id)
    SELECT v_event,u FROM (SELECT DISTINCT unnest(p_users) AS u) targets
    WHERE u IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users x WHERE x.user_id=u AND x.deactivated IS TRUE);
  INSERT INTO public.push_deliveries(recipient_id,device_id,owner_id,environment,project_id)
    SELECT r.id,d.id,r.user_id,d.environment,d.project_id FROM public.notification_recipients r
    JOIN public.push_devices d ON d.user_id=r.user_id AND d.active
    JOIN public.notification_preferences p ON p.user_id=r.user_id AND p.push_enabled
    WHERE r.event_id=v_event AND (to_jsonb(p)->>p_category)::boolean;
END;
$$;
CREATE FUNCTION public.notification_business_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_users uuid[];
BEGIN
  IF TG_TABLE_NAME='alumni_verification' THEN
    IF NOT EXISTS(SELECT 1 FROM public.admin_roles a WHERE a.user_id=auth.uid())
      AND coalesce(auth.jwt()->>'role','')<>'service_role' THEN RETURN NEW; END IF;
    SELECT array_agg(a.user_id) INTO v_users FROM public.alumni a WHERE a.id=NEW.alumni_id;
    PERFORM public.emit_notification('verification:'||NEW.alumni_id,'verification',NEW.alumni_id,'Akun terverifikasi','Status verifikasi akun Anda telah diperbarui.',v_users);
  ELSIF TG_TABLE_NAME='ticket_replies' THEN
    IF NEW.is_admin_reply IS TRUE AND (NEW.user_id=auth.uid() OR coalesce(auth.jwt()->>'role','')='service_role')
      AND EXISTS(SELECT 1 FROM public.admin_roles a WHERE a.user_id=NEW.user_id) THEN
      SELECT array_agg(t.user_id) INTO v_users FROM public.support_tickets t WHERE t.id=NEW.ticket_id AND t.user_id<>NEW.user_id;
      PERFORM public.emit_notification('ticket_reply:'||NEW.id,'support',NEW.ticket_id,'Balasan bantuan','Ada balasan baru untuk tiket bantuan Anda.',v_users);
    END IF;
  ELSIF TG_TABLE_NAME='berita' THEN
    IF NOT EXISTS(SELECT 1 FROM public.admin_roles a WHERE a.user_id=auth.uid())
      AND coalesce(auth.jwt()->>'role','')<>'service_role' THEN RETURN NEW; END IF;
    IF NEW.publication_date IS NOT NULL AND NEW.publication_date<=(now() AT TIME ZONE 'Asia/Jakarta')::date THEN
      IF TG_OP='UPDATE' AND OLD.publication_date IS NOT NULL
        AND OLD.publication_date<=(now() AT TIME ZONE 'Asia/Jakarta')::date THEN RETURN NEW; END IF;
      SELECT array_agg(p.user_id) INTO v_users FROM public.notification_preferences p WHERE p.news;
      PERFORM public.emit_notification('news:'||NEW.id,'news',NEW.id,'Berita terbaru','Ada berita baru di Satu Teladan.',v_users);
    END IF;
  ELSIF TG_TABLE_NAME='kegiatan_verification' THEN
    IF NOT EXISTS(SELECT 1 FROM public.admin_roles a WHERE a.user_id=auth.uid())
      AND coalesce(auth.jwt()->>'role','')<>'service_role' THEN RETURN NEW; END IF;
    SELECT array_agg(DISTINCT a.user_id) INTO v_users FROM public.kegiatan k
      JOIN public.komunitas_member m ON m.komunitas_id=k.komunitas_id JOIN public.alumni a ON a.id=m.alumni_id
      WHERE k.id=NEW.kegiatan_id;
    PERFORM public.emit_notification('community_event:'||NEW.kegiatan_id,'community',NEW.kegiatan_id,'Kegiatan komunitas','Ada kegiatan baru dari komunitas yang Anda ikuti.',v_users);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_verification AFTER INSERT ON public.alumni_verification FOR EACH ROW EXECUTE FUNCTION public.notification_business_trigger();
CREATE TRIGGER notify_ticket_reply AFTER INSERT ON public.ticket_replies FOR EACH ROW EXECUTE FUNCTION public.notification_business_trigger();
CREATE TRIGGER notify_news AFTER INSERT OR UPDATE OF publication_date ON public.berita FOR EACH ROW EXECUTE FUNCTION public.notification_business_trigger();
CREATE TRIGGER notify_community_activity AFTER INSERT ON public.kegiatan_verification FOR EACH ROW EXECUTE FUNCTION public.notification_business_trigger();

CREATE FUNCTION public.claim_push_jobs(p_environment text,p_project uuid,p_receipts boolean DEFAULT false)
RETURNS TABLE(id uuid,lease_id uuid,device_id uuid,token text,recipient_id uuid,receipt_id text,title text,body text,attempts integer,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_lease uuid := gen_random_uuid();
BEGIN
  -- A crashed send has an unknown outcome: don't blindly resend and create duplicates.
  UPDATE public.push_deliveries SET status=CASE WHEN push_deliveries.receipt_id IS NULL THEN 'unknown' ELSE 'receipt' END,error_code='lease_expired'
    WHERE status='sending' AND leased_at<now()-interval '5 minutes';
  UPDATE public.push_deliveries j SET status='cancelled' FROM public.push_devices d,public.notification_recipients r,public.notification_events e
    WHERE j.device_id=d.id AND j.recipient_id=r.id AND r.event_id=e.id AND j.status IN ('queued','receipt')
      AND (NOT d.active OR d.user_id<>j.owner_id OR d.environment<>j.environment OR d.project_id<>j.project_id OR e.expires_at<now() OR NOT EXISTS(
        SELECT 1 FROM auth.sessions s WHERE s.id=d.session_id AND s.user_id=d.user_id)
        OR EXISTS(SELECT 1 FROM public.users u WHERE u.user_id=d.user_id AND u.deactivated IS TRUE)
        OR NOT EXISTS(SELECT 1 FROM public.notification_preferences p WHERE p.user_id=d.user_id
          AND p.push_enabled AND (to_jsonb(p)->>e.category)::boolean)
        OR (e.category='verification' AND NOT EXISTS(SELECT 1 FROM public.alumni_verification v JOIN public.alumni a ON a.id=v.alumni_id WHERE a.id=e.entity_id AND a.user_id=j.owner_id))
        OR (e.category='support' AND NOT EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=e.entity_id AND t.user_id=j.owner_id))
        OR (e.category='news' AND NOT EXISTS(SELECT 1 FROM public.berita b WHERE b.id=e.entity_id AND b.publication_date<=(now() AT TIME ZONE 'Asia/Jakarta')::date))
        OR (e.category='community' AND NOT EXISTS(SELECT 1 FROM public.kegiatan k JOIN public.komunitas_member m ON m.komunitas_id=k.komunitas_id JOIN public.alumni a ON a.id=m.alumni_id WHERE k.id=e.entity_id AND a.user_id=j.owner_id)));
  RETURN QUERY WITH candidates AS (
    SELECT j.id FROM public.push_deliveries j JOIN public.push_devices d ON d.id=j.device_id
    JOIN public.notification_preferences p ON p.user_id=d.user_id
    JOIN public.notification_recipients r ON r.id=j.recipient_id
    JOIN public.notification_events e ON e.id=r.event_id
    WHERE j.environment=p_environment AND j.project_id=p_project AND j.next_attempt_at<=now()
      AND j.status=CASE WHEN p_receipts THEN 'receipt' ELSE 'queued' END
      AND (p_receipts OR e.category NOT IN ('news','community') OR (
        NOT EXISTS(SELECT 1 FROM public.push_deliveries recent WHERE recent.device_id=j.device_id
          AND recent.status IN ('sending','receipt','delivered','unknown')
          AND coalesce(recent.sent_at,recent.leased_at)>now()-interval '15 minutes')
        AND j.id=(SELECT first_job.id FROM public.push_deliveries first_job
          JOIN public.notification_recipients fr ON fr.id=first_job.recipient_id
          JOIN public.notification_events fe ON fe.id=fr.event_id
          WHERE first_job.device_id=j.device_id AND first_job.status='queued' AND first_job.next_attempt_at<=now()
            AND fe.category IN ('news','community') ORDER BY first_job.next_attempt_at,first_job.id LIMIT 1)
      ))
      AND (p_receipts OR p.quiet_start IS NULL OR NOT (
        CASE WHEN p.quiet_start<p.quiet_end THEN extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')>=p.quiet_start AND extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')<p.quiet_end
        ELSE extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')>=p.quiet_start OR extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')<p.quiet_end END))
    ORDER BY j.next_attempt_at,j.id LIMIT 50 FOR UPDATE OF j SKIP LOCKED
  ), leased AS (
    UPDATE public.push_deliveries j SET status='sending',lease_id=v_lease,leased_at=now(),attempts=j.attempts+CASE WHEN p_receipts THEN 0 ELSE 1 END
    FROM candidates c WHERE j.id=c.id RETURNING j.*
  ) SELECT l.id,l.lease_id,l.device_id,d.token,l.recipient_id,l.receipt_id,e.title,e.body,l.attempts,e.expires_at FROM leased l
    JOIN public.push_devices d ON d.id=l.device_id JOIN public.notification_recipients r ON r.id=l.recipient_id
    JOIN public.notification_events e ON e.id=r.event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_notification(text,text,uuid,text,text,uuid[]),public.notification_business_trigger(),public.claim_push_jobs(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_jobs(text,uuid,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.set_notification_preferences(jsonb),public.register_push_device(uuid,text,text,text,text,uuid),public.mark_notification_read(uuid),public.release_push_device(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(jsonb),public.register_push_device(uuid,text,text,text,text,uuid),public.mark_notification_read(uuid),public.release_push_device(uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_push_device(uuid,text,uuid) TO anon;
COMMIT;
