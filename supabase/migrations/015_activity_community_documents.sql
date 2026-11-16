BEGIN;

ALTER TABLE public.kegiatan
  ADD COLUMN IF NOT EXISTS edaran_url text,
  ADD COLUMN IF NOT EXISTS report_url text;
ALTER TABLE public.komunitas
  ADD COLUMN IF NOT EXISTS edaran_url text,
  ADD COLUMN IF NOT EXISTS report_url text;

DO $migration$
DECLARE
  target text;
  column_name text;
  constraint_name text;
BEGIN
  FOREACH target IN ARRAY ARRAY['kegiatan', 'komunitas'] LOOP
    FOREACH column_name IN ARRAY ARRAY['edaran_url', 'report_url'] LOOP
      constraint_name := target || '_' || column_name || '_google_document';
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = format('public.%I', target)::regclass AND conname = constraint_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I ~ %L)',
          target, constraint_name, column_name, column_name,
          '^https://(drive|docs)[.]google[.]com/[^[:space:]]+$'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$migration$;

COMMIT;
