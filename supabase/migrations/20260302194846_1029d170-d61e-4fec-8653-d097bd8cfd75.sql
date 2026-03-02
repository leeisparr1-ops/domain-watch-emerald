
-- Remove duplicate/conflicting policies on emailed_domains
DROP POLICY IF EXISTS "No deletes on emailed domains" ON public.emailed_domains;
DROP POLICY IF EXISTS "Only service role can insert emailed domains" ON public.emailed_domains;
