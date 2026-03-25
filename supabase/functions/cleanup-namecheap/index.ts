import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 500;
const MAX_BATCHES = 80; // ~40K rows per invocation
const BATCH_DELAY_MS = 400;
const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require SYNC_SECRET or service_role key
  const syncSecret = Deno.env.get('SYNC_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');
  const providedToken = authHeader?.replace('Bearer ', '') || '';
  
  if (providedToken !== syncSecret && providedToken !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey
  );

  const startTime = Date.now();
  let totalDeleted = 0;
  let batchesRun = 0;
  let errors: string[] = [];
  let moreRemaining = false;

  try {
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      let deleted = 0;
      let batchError: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { data, error } = await supabase.rpc('delete_namecheap_batch', {
          batch_size: BATCH_SIZE,
        });

        if (error) {
          const msg = error.message || 'Unknown error';
          const isRetryable = msg.includes('deadlock') || msg.includes('timeout') || msg.includes('lock');
          if (isRetryable && attempt < MAX_RETRIES) {
            console.warn(`Batch ${batch + 1} attempt ${attempt}: ${msg}, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          batchError = msg;
          break;
        }

        deleted = data ?? 0;
        break;
      }

      batchesRun++;

      if (batchError) {
        errors.push(`Batch ${batchesRun}: ${batchError}`);
        if (errors.length >= 3) {
          console.error('Too many errors, stopping.');
          break;
        }
        continue;
      }

      totalDeleted += deleted;
      console.log(`Batch ${batchesRun}: deleted ${deleted} rows (total: ${totalDeleted})`);

      if (deleted === 0) {
        console.log('No more Namecheap rows. Cleanup complete!');
        break;
      }

      if (batch === MAX_BATCHES - 1 && deleted > 0) {
        moreRemaining = true;
      }

      // Throttle between batches
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    const durationMs = Date.now() - startTime;

    // Log to sync_history
    await supabase.from('sync_history').insert({
      inventory_source: 'namecheap_cleanup',
      auctions_count: totalDeleted,
      success: errors.length === 0,
      duration_ms: durationMs,
      error_message: errors.length > 0 ? errors.join('; ') : null,
    });

    console.log(`Cleanup: ${totalDeleted} deleted in ${batchesRun} batches (${durationMs}ms)`);

    // Self-chain if more rows remain
    if (moreRemaining && errors.length === 0) {
      try {
        const projectUrl = Deno.env.get('SUPABASE_URL')!;
        await fetch(`${projectUrl}/functions/v1/cleanup-namecheap`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${syncSecret}`,
            'Content-Type': 'application/json',
            'Prefer': 'respond-async',
          },
        });
        console.log('Chained next cleanup invocation.');
      } catch (e) {
        console.warn('Failed to chain:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalDeleted, batchesRun, durationMs, moreRemaining, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await supabase.from('sync_history').insert({
      inventory_source: 'namecheap_cleanup',
      auctions_count: totalDeleted,
      success: false,
      duration_ms: durationMs,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Cleanup failed', totalDeleted }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
