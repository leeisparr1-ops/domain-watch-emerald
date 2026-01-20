import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 100; // Small batches to avoid timeouts
const MAX_BATCHES = 200; // Up to 20k deletions per run

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role key and proper auth config
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse optional parameters
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

    // Delete in small batches to avoid timeouts
    while (batchCount < maxBatches && consecutiveErrors < 3) {
      // Get IDs of expired auctions (small batch)
      const { data: expiredAuctions, error: selectError } = await supabase
        .from('auctions')
        .select('id')
        .lt('end_time', cutoffISO)
        .order('end_time', { ascending: true })
        .limit(BATCH_SIZE);

      if (selectError) {
        console.error('Error selecting expired auctions:', selectError);
        consecutiveErrors++;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      if (!expiredAuctions || expiredAuctions.length === 0) {
        console.log('No more expired auctions to delete');
        break;
      }

      const idsToDelete = expiredAuctions.map(row => row.id);

      // Delete by specific IDs (more reliable than filter-based delete)
      const { error: deleteError } = await supabase
        .from('auctions')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        consecutiveErrors++;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      consecutiveErrors = 0; // Reset on success
      totalDeleted += idsToDelete.length;
      batchCount++;

      if (batchCount % 10 === 0) {
        console.log(`Progress: Batch ${batchCount}, deleted ${totalDeleted} auctions`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // If we got less than batch size, we're probably done
      if (idsToDelete.length < BATCH_SIZE) {
        break;
      }
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
