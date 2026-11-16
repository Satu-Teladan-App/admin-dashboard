-- Optional staging/production operation, NOT executed by the implementation.
-- Prerequisites: pg_cron, pg_net and Vault; deploy push-dispatch first.
-- In Vault create satu_push_worker_url (full Edge Function HTTPS URL) and
-- satu_push_dispatch_secret (same random secret as PUSH_DISPATCH_SECRET).
-- The environment/project used by the worker must match this database/build.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='satu_push_worker_url')
    OR NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='satu_push_dispatch_secret') THEN
    RAISE EXCEPTION 'Configure push scheduler Vault secrets first';
  END IF;
END $$;

SELECT cron.schedule('satu-push-dispatch','* * * * *',$job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='satu_push_worker_url'),
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='satu_push_dispatch_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$job$);
