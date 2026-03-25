import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 2000;
const MAX_BATCHES_PER_INVOCATION = 25; // ~50K rows per invocation
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require SYNC_SECRET
  const syncSecret = Deno.env.get('SYNC_SECRET');
  const authHeader = req.headers.get('Authorization');
  const providedToken = authHeader?.replace('Bearer ', '') || '';
  if (!syncSecret || providedToken !== syncSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  let totalDeleted = 0;
  let batchesRun = 0;
  let errors: string[] = [];
  let moreRemaining = false;

  try {
    for (let batch = 0; batch < MAX_BATCHES_PER_INVOCATION; batch++) {
      // Find IDs to delete (avoids locking full table scan)
      const { data: rows, error: selectErr } = await supabase
        .from('auctions')
        .select('id')
        .or('inventory_source.eq.namecheap,inventory_source.like.namecheap_%')
        .limit(BATCH_SIZE);

      if (selectErr) {
        errors.push(`Select error: ${selectErr.message}`);
        break;
      }

      if (!rows || rows.length === 0) {
        console.log('No more Namecheap rows found. Cleanup complete.');
        break;
      }

      const ids = rows.map(r => r.id);
      let deleted = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { error: deleteErr } = await supabase
          .from('auctions')
          .delete()
          .in('id', ids);

        if (!deleteErr) {
          totalDeleted += ids.length;
          deleted = true;
          break;
        }

        const msg = deleteErr.message || '';
        const isRetryable = msg.includes('deadlock') || msg.includes('timeout') || msg.includes('lock');
        
        if (isRetryable && attempt < MAX_RETRIES) {
          console.warn(`Batch ${batch + 1} attempt ${attempt} failed (${msg}), retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          errors.push(`Batch ${batch + 1}: ${msg}`);
          break;
        }
      }

      batchesRun++;

      if (!deleted && errors.length > 3) {
        console.error('Too many errors, stopping early.');
        break;
      }

      // Check if there might be more
      if (batch === MAX_BATCHES_PER_INVOCATION - 1 && rows.length === BATCH_SIZE) {
        moreRemaining = true;
      }

      // Throttle to avoid starving other queries
      if (batch + 1 < MAX_BATCHES_PER_INVOCATION) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
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

    console.log(`Cleanup done: ${totalDeleted} rows deleted in ${batchesRun} batches (${durationMs}ms)`);

    // Self-chain if more rows remain
    if (moreRemaining && errors.length === 0) {
      const projectUrl = Deno.env.get('SUPABASE_URL')!;
      try {
        await fetch(`${projectUrl}/functions/v1/cleanup-namecheap`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${syncSecret}`,
            'Content-Type': 'application/json',
            'Prefer': 'respond-async',
          },
        });
        console.log('Chained next cleanup invocation.');
      } catch (chainErr) {
        console.warn('Failed to chain next invocation:', chainErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        batchesRun,
        durationMs,
        moreRemaining,
        errors: errors.length > 0 ? errors : undefined,
      }),
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
