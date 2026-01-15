-- Create auctions table to store GoDaddy auction data
CREATE TABLE public.auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  bid_count INTEGER NOT NULL DEFAULT 0,
  traffic_count INTEGER NOT NULL DEFAULT 0,
  end_time TIMESTAMPTZ,
  valuation NUMERIC,
  auction_type TEXT,
  domain_age INTEGER,
  tld TEXT,
  inventory_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX idx_auctions_price ON public.auctions(price);
CREATE INDEX idx_auctions_tld ON public.auctions(tld);
CREATE INDEX idx_auctions_domain_name ON public.auctions(domain_name);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone can view auctions)
CREATE POLICY "Anyone can view auctions"
ON public.auctions
FOR SELECT
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_auctions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.update_auctions_updated_at();

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;