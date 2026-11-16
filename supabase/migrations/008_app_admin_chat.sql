BEGIN;

CREATE OR REPLACE FUNCTION public.app_admin_allowed(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_roles a
      JOIN public.role_permissions rp ON rp.role_id=a.role_id
      JOIN public.permissions p ON p.id=rp.permission_id
      WHERE a.user_id=auth.uid() AND p.name IN (p_permission,
        CASE p_permission WHEN 'manage_users' THEN 'alumni:manage'
          WHEN 'manage_roles' THEN 'admin:manage' WHEN 'manage_berita' THEN 'berita:manage'
          WHEN 'manage_kegiatan' THEN 'kegiatan:manage' WHEN 'manage_komunitas' THEN 'komunitas:manage'
          WHEN 'manage_donasi' THEN 'donasi:manage' WHEN 'moderate_content' THEN 'messages:manage' END)
    );
$$;
REVOKE ALL ON FUNCTION public.app_admin_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.app_admin_allowed(text) TO authenticated;

INSERT INTO public.permissions(name,description) VALUES ('manage_support','Menangani percakapan bantuan pengguna'),
  ('view_analytics','Melihat statistik agregat dashboard')
ON CONFLICT(name) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT DISTINCT rp.role_id,p.id FROM public.role_permissions rp
JOIN public.permissions old ON old.id=rp.permission_id AND old.name IN ('moderate_content','manage_users','manage_roles','messages:manage','alumni:manage','admin:manage')
CROSS JOIN public.permissions p WHERE p.name='manage_support'
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT DISTINCT rp.role_id,p.id FROM public.role_permissions rp JOIN public.permissions old ON old.id=rp.permission_id
  AND old.name IN ('komunitas:manage','berita:manage','kegiatan:manage','donasi:manage','messages:manage','alumni:manage','admin:manage',
    'manage_users','manage_roles','manage_berita','manage_kegiatan','manage_komunitas','manage_donasi','moderate_content')
CROSS JOIN public.permissions p WHERE p.name='view_analytics'
ON CONFLICT DO NOTHING;

CREATE TABLE public.ticket_internal_notes (
  ticket_id uuid PRIMARY KEY REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
INSERT INTO public.ticket_internal_notes(ticket_id,body)
SELECT id,admin_notes FROM public.support_tickets WHERE nullif(btrim(admin_notes),'') IS NOT NULL;
UPDATE public.support_tickets SET admin_notes=NULL WHERE admin_notes IS NOT NULL;
ALTER TABLE public.ticket_internal_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ticket_internal_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ticket_internal_notes TO authenticated;
CREATE POLICY ticket_notes_admin_read ON public.ticket_internal_notes FOR SELECT TO authenticated
USING (public.app_admin_allowed('manage_support'));

CREATE TABLE public.admin_conversations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.support_tickets(id)
);
CREATE TABLE public.support_message_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  reply_id uuid REFERENCES public.ticket_replies(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ticket_read_states (
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  read_at timestamptz NOT NULL,
  PRIMARY KEY(ticket_id,user_id)
);
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_read_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_conversations,public.support_message_requests,public.ticket_read_states FROM PUBLIC,anon,authenticated;
CREATE INDEX ticket_replies_thread_order ON public.ticket_replies(ticket_id,created_at,id);

-- Replace the old owner policies: they allowed a caller to choose is_admin_reply.
DO $$ DECLARE p record;
BEGIN
  FOR p IN SELECT tablename,policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('support_tickets','ticket_replies')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); END LOOP;
END $$;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.support_tickets,public.ticket_replies TO authenticated;
REVOKE ALL ON public.support_tickets,public.ticket_replies FROM anon,PUBLIC;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES ON public.support_tickets,public.ticket_replies FROM authenticated;
CREATE POLICY ticket_owner_read ON public.support_tickets FOR SELECT TO authenticated
USING(user_id=auth.uid() OR public.app_admin_allowed('manage_support'));
CREATE POLICY ticket_owner_create ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK(user_id=auth.uid() AND status='pending' AND priority='normal'
  AND admin_notes IS NULL AND resolved_at IS NULL);
CREATE POLICY reply_participant_read ON public.ticket_replies FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id
  AND (t.user_id=auth.uid() OR public.app_admin_allowed('manage_support'))));
CREATE POLICY reply_owner_create ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK(user_id=auth.uid() AND is_admin_reply IS FALSE AND EXISTS(
  SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id AND t.user_id=auth.uid()));

CREATE OR REPLACE FUNCTION public.send_admin_chat_message(p_message text,p_request_id uuid,p_ticket_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); ticket public.support_tickets%ROWTYPE;
  previous public.support_message_requests%ROWTYPE; result_reply uuid; admin_reply boolean;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Silakan login kembali' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR nullif(btrim(p_message),'') IS NULL OR length(p_message)>5000 THEN
    RAISE EXCEPTION 'Pesan wajib diisi, maksimal 5000 karakter'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
  SELECT * INTO previous FROM public.support_message_requests WHERE id=p_request_id;
  IF FOUND THEN
    IF previous.user_id<>actor OR previous.body<>btrim(p_message)
      OR (p_ticket_id IS NOT NULL AND previous.ticket_id<>p_ticket_id) THEN
      RAISE EXCEPTION 'Referensi pengiriman sudah digunakan'; END IF;
    RETURN jsonb_build_object('ticket_id',previous.ticket_id,'reply_id',previous.reply_id);
  END IF;
  IF p_ticket_id IS NOT NULL THEN
    SELECT * INTO ticket FROM public.support_tickets WHERE id=p_ticket_id FOR UPDATE;
    IF NOT FOUND OR (ticket.user_id<>actor AND NOT public.app_admin_allowed('manage_support')) THEN
      RAISE EXCEPTION 'Percakapan tidak tersedia' USING ERRCODE='42501'; END IF;
  ELSE
    SELECT t.* INTO ticket FROM public.admin_conversations c JOIN public.support_tickets t ON t.id=c.ticket_id
      WHERE c.user_id=actor FOR UPDATE OF t;
    IF NOT FOUND THEN
      SELECT * INTO ticket FROM public.support_tickets WHERE user_id=actor ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
      IF FOUND THEN INSERT INTO public.admin_conversations VALUES(actor,ticket.id); END IF;
    END IF;
  END IF;
  IF ticket.id IS NULL THEN
    INSERT INTO public.support_tickets(user_id,subject,message,status,priority)
    VALUES(actor,'Chat dengan Admin',btrim(p_message),'pending','normal') RETURNING * INTO ticket;
    INSERT INTO public.admin_conversations VALUES(actor,ticket.id);
  ELSE
    admin_reply:=ticket.user_id<>actor;
    INSERT INTO public.ticket_replies(ticket_id,user_id,message,is_admin_reply)
    VALUES(ticket.id,actor,btrim(p_message),admin_reply) RETURNING id INTO result_reply;
    UPDATE public.support_tickets SET status=CASE WHEN admin_reply THEN 'in_progress' ELSE 'pending' END,
      resolved_at=NULL,updated_at=now() WHERE id=ticket.id;
  END IF;
  INSERT INTO public.support_message_requests(id,user_id,ticket_id,reply_id,body)
    VALUES(p_request_id,actor,ticket.id,result_reply,btrim(p_message));
  RETURN jsonb_build_object('ticket_id',ticket.id,'reply_id',result_reply);
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); ticket public.support_tickets%ROWTYPE; last_reply public.ticket_replies%ROWTYPE; unread bigint;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Silakan login kembali' USING ERRCODE='42501'; END IF;
  SELECT t.* INTO ticket FROM public.admin_conversations c JOIN public.support_tickets t ON t.id=c.ticket_id WHERE c.user_id=actor;
  IF NOT FOUND THEN SELECT * INTO ticket FROM public.support_tickets WHERE user_id=actor ORDER BY created_at DESC,id DESC LIMIT 1; END IF;
  IF ticket.id IS NULL THEN RETURN jsonb_build_object('ticket_id',NULL,'unread',0); END IF;
  SELECT * INTO last_reply FROM public.ticket_replies WHERE ticket_id=ticket.id ORDER BY created_at DESC,id DESC LIMIT 1;
  SELECT count(*) INTO unread FROM public.ticket_replies r WHERE r.ticket_id=ticket.id AND r.is_admin_reply
    AND r.created_at>coalesce((SELECT read_at FROM public.ticket_read_states WHERE ticket_id=ticket.id AND user_id=actor),'-infinity'::timestamptz);
  RETURN jsonb_build_object('ticket_id',ticket.id,'last_message',coalesce(last_reply.message,ticket.message),
    'last_at',coalesce(last_reply.created_at,ticket.created_at),'unread',unread,'status',ticket.status);
END $$;

CREATE OR REPLACE FUNCTION public.get_support_thread(p_ticket_id uuid,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE ticket public.support_tickets%ROWTYPE; messages jsonb; total bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan login kembali' USING ERRCODE='42501'; END IF;
  SELECT * INTO ticket FROM public.support_tickets WHERE id=p_ticket_id;
  IF NOT FOUND OR (ticket.user_id<>auth.uid() AND NOT public.app_admin_allowed('manage_support')) THEN
    RAISE EXCEPTION 'Percakapan tidak tersedia' USING ERRCODE='42501'; END IF;
  SELECT count(*) INTO total FROM public.ticket_replies WHERE ticket_id=ticket.id;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.id),'[]'::jsonb) INTO messages
  FROM (SELECT id,user_id,message,is_admin_reply,created_at FROM public.ticket_replies
    WHERE ticket_id=ticket.id ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET greatest(0,coalesce(p_offset,0))) r;
  RETURN jsonb_build_object('ticket',jsonb_build_object('id',ticket.id,'subject',ticket.subject,
    'message',ticket.message,'created_at',ticket.created_at,'status',ticket.status,'user_id',ticket.user_id),
    'messages',messages,'has_more',total>greatest(0,coalesce(p_offset,0))+50);
END $$;

CREATE OR REPLACE FUNCTION public.mark_support_thread_read(p_ticket_id uuid,p_through timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.support_tickets WHERE id=p_ticket_id
    AND (user_id=auth.uid() OR public.app_admin_allowed('manage_support'))) THEN
    RAISE EXCEPTION 'Percakapan tidak tersedia' USING ERRCODE='42501'; END IF;
  IF p_through IS NULL OR p_through>now() THEN RAISE EXCEPTION 'Waktu baca tidak valid'; END IF;
  INSERT INTO public.ticket_read_states VALUES(p_ticket_id,auth.uid(),p_through)
    ON CONFLICT(ticket_id,user_id) DO UPDATE SET read_at=greatest(public.ticket_read_states.read_at,excluded.read_at);
  IF to_regclass('public.notification_recipients') IS NOT NULL THEN
    UPDATE public.notification_recipients r SET read_at=now() FROM public.notification_events e
      WHERE e.id=r.event_id AND e.category='support' AND e.entity_id=p_ticket_id
        AND r.user_id=auth.uid() AND r.read_at IS NULL AND r.created_at<=p_through;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_ticket(p_ticket_id uuid,p_values jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ticket public.support_tickets%ROWTYPE; next_status text;
BEGIN
  IF NOT public.app_admin_allowed('manage_support') THEN RAISE EXCEPTION 'Tidak memiliki izin mengelola bantuan' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_values)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_values) k WHERE k NOT IN ('status','priority','admin_notes')) THEN
    RAISE EXCEPTION 'Perubahan tiket tidak valid'; END IF;
  IF p_values ? 'status' AND coalesce(p_values->>'status','') NOT IN ('pending','open','in_progress','resolved','closed') THEN RAISE EXCEPTION 'Status tidak valid'; END IF;
  IF p_values ? 'priority' AND coalesce(p_values->>'priority','') NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Prioritas tidak valid'; END IF;
  SELECT * INTO ticket FROM public.support_tickets WHERE id=p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tiket tidak ditemukan'; END IF;
  next_status:=coalesce(p_values->>'status',ticket.status);
  UPDATE public.support_tickets SET status=next_status,priority=coalesce(p_values->>'priority',priority),updated_at=now(),
    resolved_at=CASE WHEN next_status IN ('resolved','closed') THEN coalesce(resolved_at,now()) ELSE NULL END WHERE id=p_ticket_id RETURNING * INTO ticket;
  IF p_values ? 'admin_notes' THEN
    IF length(p_values->>'admin_notes')>20000 THEN RAISE EXCEPTION 'Catatan terlalu panjang'; END IF;
    INSERT INTO public.ticket_internal_notes VALUES(p_ticket_id,coalesce(p_values->>'admin_notes',''),now(),auth.uid())
      ON CONFLICT(ticket_id) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  END IF;
  RETURN jsonb_build_object('id',ticket.id,'status',ticket.status,'priority',ticket.priority,'resolved_at',ticket.resolved_at,'updated_at',ticket.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.set_my_ranking_consent(p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_enabled IS NULL THEN RAISE EXCEPTION 'Authentication and choice required' USING ERRCODE='42501'; END IF;
  UPDATE public.alumni SET consents=jsonb_set(CASE WHEN jsonb_typeof(consents)='object' THEN consents ELSE '{}'::jsonb END,
    '{ranking}',to_jsonb(p_enabled),true) WHERE user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Alumni profile required'; END IF;
  RETURN p_enabled;
END $$;

DO $$ DECLARE f regprocedure;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.send_admin_chat_message(text,uuid,uuid)'::regprocedure,'public.get_admin_chat_summary()'::regprocedure,
    'public.get_support_thread(uuid,integer)'::regprocedure,'public.mark_support_thread_read(uuid,timestamptz)'::regprocedure,
    'public.admin_update_ticket(uuid,jsonb)'::regprocedure,'public.set_my_ranking_consent(boolean)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f);
  END LOOP;
END $$;

DO $$ DECLARE target text;
BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH target IN ARRAY ARRAY['support_tickets','ticket_replies'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=target) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',target);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
