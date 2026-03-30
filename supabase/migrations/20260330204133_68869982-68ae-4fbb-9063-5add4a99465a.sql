
-- Check what secret names are in vault
SELECT name FROM vault.decrypted_secrets WHERE name IN ('SYNC_SECRET', 'SUPABASE_SERVICE_ROLE_KEY') ORDER BY name;
