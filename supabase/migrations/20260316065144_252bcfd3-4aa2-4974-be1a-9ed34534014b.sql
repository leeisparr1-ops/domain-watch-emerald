-- Allow all authenticated users to view shared/system scans and their own scans

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage own scans" ON public.drop_scans;
DROP POLICY IF EXISTS "Users can view own scan results" ON public.drop_scan_results;

-- drop_scans: allow all authenticated to SELECT any scan, but only own for INSERT/UPDATE/DELETE
CREATE POLICY "Anyone authenticated can view scans"
  ON public.drop_scans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own scans"
  ON public.drop_scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON public.drop_scans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON public.drop_scans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- drop_scan_results: allow all authenticated users to view all results
CREATE POLICY "Anyone authenticated can view scan results"
  ON public.drop_scan_results FOR SELECT TO authenticated
  USING (true);