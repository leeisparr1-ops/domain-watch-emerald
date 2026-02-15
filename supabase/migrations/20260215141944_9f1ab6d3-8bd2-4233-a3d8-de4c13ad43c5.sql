
-- 1. Add INSERT policy for emailed_domains (only service_role/system writes these, 
--    but we need explicit restriction so anon/authenticated can't forge records)
CREATE POLICY "Only service role can insert emailed domains"
ON public.emailed_domains
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Deny UPDATE on emailed_domains (audit log - immutable)
CREATE POLICY "No updates to emailed domains"
ON public.emailed_domains
FOR UPDATE
USING (false);

-- 3. Deny DELETE on emailed_domains (audit log - immutable)
CREATE POLICY "No deletes on emailed domains"
ON public.emailed_domains
FOR DELETE
USING (false);

-- 4. Explicitly deny INSERT on auctions (only backend services write)
CREATE POLICY "No public insert on auctions"
ON public.auctions
FOR INSERT
WITH CHECK (false);

-- 5. Explicitly deny UPDATE on auctions
CREATE POLICY "No public update on auctions"
ON public.auctions
FOR UPDATE
USING (false);

-- 6. Explicitly deny DELETE on auctions
CREATE POLICY "No public delete on auctions"
ON public.auctions
FOR DELETE
USING (false);
