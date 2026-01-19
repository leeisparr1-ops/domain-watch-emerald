import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Large inventory types to sync in chunks
const LARGE_INVENTORY_TYPES = ['closeout', 'endingToday', 'allBiddable', 'allExpiring', 'allListings'];
const CHUNK_SIZE = 30000; // Match the sync-large-inventory chunk size

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const inventoryType = url.searchParams.get('type');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // If specific type requested, process that chunk
    if (inventoryType) {
      console.log(`Processing chunk for ${inventoryType} at offset ${offset}`);
      
      const startTime = Date.now();
      
      // Call sync-large-inventory with offset
      const syncUrl = `${supabaseUrl}/functions/v1/sync-large-inventory?type=${inventoryType}&offset=${offset}&limit=${CHUNK_SIZE}`;
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Log to sync_history
      await supabase.from('sync_history').insert({
        inventory_source: `${inventoryType}_chunk_${Math.floor(offset / CHUNK_SIZE)}`,
        success: result.success,
        auctions_count: result.count || 0,
        duration_ms: duration,
        error_message: result.error || null,
      });
      
      // If there are more chunks, schedule the next one
      if (result.hasMore && result.nextOffset !== null) {
        console.log(`Scheduling next chunk at offset ${result.nextOffset}`);
        
        // Use pg_net to call ourselves for the next chunk (async, non-blocking)
        const nextChunkUrl = `${supabaseUrl}/functions/v1/chunked-sync-orchestrator?type=${inventoryType}&offset=${result.nextOffset}`;
        
        // Fire and forget - don't await
        fetch(nextChunkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }).catch(err => console.log('Next chunk scheduled:', err));
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Processed chunk at offset ${offset}, next chunk scheduled`,
            chunk: result.chunk,
            nextOffset: result.nextOffset,
            hasMore: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Completed all chunks for ${inventoryType}`,
          totalProcessed: offset + (result.count || 0),
          hasMore: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // No specific type - start all large inventory syncs
    console.log('Starting chunked sync for all large inventory types...');
    
    const results: any[] = [];
    
    for (const type of LARGE_INVENTORY_TYPES) {
      console.log(`Starting chunked sync for: ${type}`);
      
      // Start each type from offset 0
      const startUrl = `${supabaseUrl}/functions/v1/chunked-sync-orchestrator?type=${type}&offset=0`;
      
      try {
        const response = await fetch(startUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        });
        
        const result = await response.json();
        results.push({ type, ...result });
      } catch (error) {
        results.push({ type, success: false, error: error instanceof Error ? error.message : 'Failed' });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Started chunked sync for all large inventory types',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Orchestrator error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
