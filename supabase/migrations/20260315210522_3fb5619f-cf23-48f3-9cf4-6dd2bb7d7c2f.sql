ALTER TABLE public.drop_scans ADD COLUMN IF NOT EXISTS csv_data text;
ALTER TABLE public.drop_scans ADD COLUMN IF NOT EXISTS resume_from integer NOT NULL DEFAULT 0;