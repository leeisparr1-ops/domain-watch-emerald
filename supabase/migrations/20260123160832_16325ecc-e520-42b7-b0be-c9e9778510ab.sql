-- Add notification_frequency_hours column to store user preference (2, 4, or 6 hours)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notification_frequency_hours INTEGER NOT NULL DEFAULT 2;