-- Store the SYNC_SECRET in the vault so pg_cron can use it for background pattern checks.
-- We generate a new random secret and store it. The edge function env var must also be updated to match.
DO $$
DECLARE
  new_secret TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  -- Remove any existing entry to avoid duplicates
  DELETE FROM vault.secrets WHERE name = 'SYNC_SECRET';
  
  -- Insert the new secret
  PERFORM vault.create_secret(new_secret, 'SYNC_SECRET', 'Secret for authenticating internal system calls between edge functions and cron jobs');
  
  -- Log the secret so the admin can update the edge function env var
  RAISE NOTICE 'New SYNC_SECRET generated: %', new_secret;
END $$;