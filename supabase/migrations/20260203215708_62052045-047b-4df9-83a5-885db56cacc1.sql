-- Create a table to track CSV upload processing jobs
CREATE TABLE public.csv_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_message TEXT,
  inventory_source TEXT NOT NULL DEFAULT 'namecheap',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.csv_upload_jobs ENABLE ROW LEVEL SECURITY;

-- Only admins can access their own jobs
CREATE POLICY "Admins can view their own jobs"
  ON public.csv_upload_jobs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());

CREATE POLICY "Admins can insert their own jobs"
  ON public.csv_upload_jobs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_csv_upload_jobs_updated_at
  BEFORE UPDATE ON public.csv_upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();