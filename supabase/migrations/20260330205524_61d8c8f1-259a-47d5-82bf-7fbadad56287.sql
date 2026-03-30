
-- List all cron jobs to find the right name
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
