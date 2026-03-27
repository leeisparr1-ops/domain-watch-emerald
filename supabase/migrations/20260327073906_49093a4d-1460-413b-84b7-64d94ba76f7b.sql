-- Create storage bucket for drops CSV uploads (admin only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drops-csv', 'drops-csv', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket for edge function access)
CREATE POLICY "Public read access for drops CSV"
ON storage.objects FOR SELECT
USING (bucket_id = 'drops-csv');

-- Only admins can upload
CREATE POLICY "Admin upload drops CSV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'drops-csv' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update/overwrite
CREATE POLICY "Admin update drops CSV"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'drops-csv' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete
CREATE POLICY "Admin delete drops CSV"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'drops-csv' 
  AND public.has_role(auth.uid(), 'admin')
);