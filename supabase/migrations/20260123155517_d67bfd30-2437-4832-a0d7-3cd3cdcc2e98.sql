-- Add last_email_sent_at column to track email rate limiting
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE;