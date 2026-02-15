-- Replace the random secret with a known value we can share
DO $$
BEGIN
  DELETE FROM vault.secrets WHERE name = 'SYNC_SECRET';
  PERFORM vault.create_secret('expiredhawk_sync_2026_v2', 'SYNC_SECRET', 'Secret for authenticating internal system calls');
END $$;