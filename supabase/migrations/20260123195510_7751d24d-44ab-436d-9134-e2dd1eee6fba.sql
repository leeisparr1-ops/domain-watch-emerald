-- Drop the existing public access policy on sync_history
DROP POLICY IF EXISTS "Anyone can view sync history" ON public.sync_history;

-- Create restrictive policy - no public access (service role only)
CREATE POLICY "No public access to sync history"
ON public.sync_history FOR SELECT
USING (false);