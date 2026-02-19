
-- Table to store recent comparable domain sales for AI valuation context
CREATE TABLE public.comparable_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name text NOT NULL,
  sale_price numeric NOT NULL,
  sale_date date,
  tld text,
  venue text, -- e.g. 'Afternic', 'Sedo', 'GoDaddy Auctions', 'NameBio'
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only admins can manage, anyone can read (used by AI advisor)
ALTER TABLE public.comparable_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comparable sales"
  ON public.comparable_sales FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage comparable sales"
  ON public.comparable_sales FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Index for quick lookups by TLD and price
CREATE INDEX idx_comparable_sales_tld ON public.comparable_sales(tld);
CREATE INDEX idx_comparable_sales_price ON public.comparable_sales(sale_price DESC);
