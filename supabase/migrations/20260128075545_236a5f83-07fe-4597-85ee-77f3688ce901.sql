-- Add min_length, max_length, min_age, and max_age columns to user_patterns table
ALTER TABLE public.user_patterns 
ADD COLUMN IF NOT EXISTS min_length INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_length INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_age INTEGER DEFAULT NULL;