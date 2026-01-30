import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 500; // Larger batches for faster cleanup
const MAX_BATCHES = 500; // Up to 250k deletions per run

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const daysOld = parseInt(url.searchParams.get('days') || '0');
    const maxBatches = Math.min(parseInt(url.searchParams.get('maxBatches') || String(MAX_BATCHES)), MAX_BATCHES);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cleaning up auctions ended before ${cutoffISO} (${daysOld} days ago)`);

    let totalDeleted = 0;
    let batchCount = 0;
    let consecutiveErrors = 0;

    // Delete in batches using direct SQL for better performance
    while (batchCount < maxBatches && consecutiveErrors < 3) {
      // Use raw SQL delete with LIMIT for better performance on large tables
      const { data, error: deleteError } = await supabase.rpc('delete_expired_auctions_batch', {
        cutoff_time: cutoffISO,
        batch_limit: BATCH_SIZE
      }).single();

      // Fallback to regular delete if RPC not available
      if (deleteError?.code === 'PGRST202') {
        // Get IDs of expired auctions - EXCLUDE closeout inventory (buy-now, no real end time)
        const { data: expiredAuctions, error: selectError } = await supabase
          .from('auctions')
          .select('id')
          .lt('end_time', cutoffISO)
          .not('auction_type', 'eq', 'closeout')
          .not('inventory_source', 'eq', 'closeout')
          .order('end_time', { ascending: true })
          .limit(BATCH_SIZE);

        if (selectError) {
          console.error('Error selecting expired auctions:', selectError);
          consecutiveErrors++;
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        if (!expiredAuctions || expiredAuctions.length === 0) {
          console.log('No more expired auctions to delete');
          break;
        }

        const idsToDelete = expiredAuctions.map(row => row.id);

        const { error: delError } = await supabase
          .from('auctions')
          .delete()
          .in('id', idsToDelete);

        if (delError) {
          console.error('Error deleting batch:', delError);
          consecutiveErrors++;
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        consecutiveErrors = 0;
        totalDeleted += idsToDelete.length;
        batchCount++;

        if (batchCount % 20 === 0) {
          console.log(`Progress: Batch ${batchCount}, deleted ${totalDeleted} auctions`);
        }

        // Minimal delay between batches
        await new Promise(resolve => setTimeout(resolve, 20));
        
        if (idsToDelete.length < BATCH_SIZE) {
          break;
        }
        continue;
      }

      if (deleteError) {
        console.error('Error with RPC delete:', deleteError);
        consecutiveErrors++;
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      const deletedCount = (data as { deleted_count?: number })?.deleted_count || 0;
      if (deletedCount === 0) {
        console.log('No more expired auctions to delete');
        break;
      }

      consecutiveErrors = 0;
      totalDeleted += deletedCount;
      batchCount++;

      if (batchCount % 20 === 0) {
        console.log(`Progress: Batch ${batchCount}, deleted ${totalDeleted} auctions`);
      }

      await new Promise(resolve => setTimeout(resolve, 20));
    }

    const durationMs = Date.now() - startTime;

    const result = {
      success: true,
      deleted: totalDeleted,
      batches: batchCount,
      durationMs,
      cutoffDate: cutoffISO,
      message: `Deleted ${totalDeleted} expired auctions in ${batchCount} batches`,
    };

    console.log('Cleanup complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
