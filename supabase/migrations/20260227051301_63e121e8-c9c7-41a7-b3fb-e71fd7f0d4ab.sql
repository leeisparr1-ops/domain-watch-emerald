
-- Add missing INSERT policy for emailed_domains (restrict to own records)
CREATE POLICY "Users can insert their own emailed domains"
ON public.emailed_domains
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add missing DELETE policy for emailed_domains
CREATE POLICY "Users can delete their own emailed domains"
ON public.emailed_domains
FOR DELETE
USING (auth.uid() = user_id);

-- Add missing UPDATE policy for pattern_alerts
CREATE POLICY "Users can update their own pattern alerts"
ON public.pattern_alerts
FOR UPDATE
USING (auth.uid() = user_id);

-- Add missing UPDATE policy for favorites
CREATE POLICY "Users can update their own favorites"
ON public.favorites
FOR UPDATE
USING (auth.uid() = user_id);

-- Add missing DELETE policy for user_settings
CREATE POLICY "Users can delete their own settings"
ON public.user_settings
FOR DELETE
USING (auth.uid() = user_id);
