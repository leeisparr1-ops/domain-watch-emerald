-- Create user_patterns table to store saved patterns for alerts
CREATE TABLE public.user_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'regex',
  description TEXT,
  max_price NUMERIC DEFAULT NULL,
  min_price NUMERIC DEFAULT 0,
  tld_filter TEXT DEFAULT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_matched_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own patterns" 
ON public.user_patterns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patterns" 
ON public.user_patterns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" 
ON public.user_patterns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns" 
ON public.user_patterns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_patterns_updated_at
BEFORE UPDATE ON public.user_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_auctions_updated_at();

-- Create pattern_alerts table to track which domains have been alerted
CREATE TABLE public.pattern_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_id UUID NOT NULL REFERENCES public.user_patterns(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pattern_id, auction_id)
);

-- Enable Row Level Security
ALTER TABLE public.pattern_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for pattern_alerts
CREATE POLICY "Users can view their own pattern alerts" 
ON public.pattern_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pattern alerts" 
ON public.pattern_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pattern alerts" 
ON public.pattern_alerts 
FOR DELETE 
USING (auth.uid() = user_id);