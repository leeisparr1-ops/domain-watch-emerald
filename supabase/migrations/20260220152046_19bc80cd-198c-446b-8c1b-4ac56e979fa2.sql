
-- Create table for saved name generator sessions
CREATE TABLE public.generator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT NOT NULL DEFAULT 'Untitled Session',
  input_mode TEXT NOT NULL DEFAULT 'keywords',
  keywords TEXT,
  inspired_by TEXT,
  competitors TEXT,
  industry TEXT,
  style TEXT NOT NULL DEFAULT 'mixed',
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generator_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.generator_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.generator_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.generator_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.generator_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_generator_sessions_updated_at
  BEFORE UPDATE ON public.generator_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
