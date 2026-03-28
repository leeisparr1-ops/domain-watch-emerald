
CREATE OR REPLACE FUNCTION public.protect_subscription_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Only the system can modify subscription_plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_plan_trigger ON public.user_settings;
CREATE TRIGGER protect_subscription_plan_trigger
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_plan();
