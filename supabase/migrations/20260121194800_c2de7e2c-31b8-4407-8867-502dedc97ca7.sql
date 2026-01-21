-- Add subscription_plan column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free';

-- Update your account to Advanced plan
UPDATE public.user_settings 
SET subscription_plan = 'advanced' 
WHERE user_id = '2e8f1c79-6925-4d40-9894-e183057a4ea6';