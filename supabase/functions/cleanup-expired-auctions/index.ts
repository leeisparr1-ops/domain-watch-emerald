import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const MAX_BATCHES = 50; // Max 50k deletions per run to prevent timeout

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    const url = new URL(req.url);
    const daysOld = parseInt(url.searchParams.get('days') || '3');
    const maxBatches = parseInt(url.searchParams.get('maxBatches') || String(MAX_BATCHES));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cleaning up auctions older than ${daysOld} days (before ${cutoffISO})`);

    let totalDeleted = 0;
    let batchCount = 0;

    // Delete in batches to avoid overloading the database
    while (batchCount < maxBatches) {
      // First, get IDs of expired auctions
      const { data: expiredIds, error: selectError } = await supabase
        .from('auctions')
        .select('id')
        .lt('end_time', cutoffISO)
        .limit(BATCH_SIZE);

      if (selectError) {
        console.error('Error selecting expired auctions:', selectError);
        throw selectError;
      }

      if (!expiredIds || expiredIds.length === 0) {
        console.log('No more expired auctions to delete');
        break;
      }

      const idsToDelete = expiredIds.map(row => row.id);

      // Delete this batch
      const { error: deleteError, count } = await supabase
        .from('auctions')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        throw deleteError;
      }

      const deletedCount = count || idsToDelete.length;
      totalDeleted += deletedCount;
      batchCount++;

      console.log(`Batch ${batchCount}: Deleted ${deletedCount} auctions (total: ${totalDeleted})`);

      // Small delay between batches to reduce DB pressure
      if (expiredIds.length === BATCH_SIZE) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const durationMs = Date.now() - startTime;

    // Get remaining count of expired auctions
    const { count: remainingCount } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true })
      .lt('end_time', cutoffISO);

    const result = {
      success: true,
      deleted: totalDeleted,
      batches: batchCount,
      remainingExpired: remainingCount || 0,
      durationMs,
      cutoffDate: cutoffISO,
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
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
