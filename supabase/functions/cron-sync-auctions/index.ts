import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All inventory types to sync - small files (reliable)
const INVENTORY_TYPES = [
  'featured',
  'mostActive', 
  'listings2',
  'nonAdultListings2',
  'fiveLetter',
  'withPageviews',
  'recent',
  'auctionsEndingToday',
  'endingTomorrow',
  'auctionsEndingTomorrow'
];

// Large inventory types - synced separately with memory-optimized function
const LARGE_INVENTORY_TYPES = [
  'closeout',
  'expiring',
  'endingToday',
  'allBiddable',
  'allExpiring',
  'allListings'
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const overallStartTime = Date.now();
  const results: { type: string; success: boolean; count?: number; error?: string; duration_ms?: number }[] = [];
  
  console.log(`Starting scheduled sync for ${INVENTORY_TYPES.length} inventory sources...`);

  const projectUrl = supabaseUrl;
  
  // Process each inventory type sequentially to avoid overwhelming the system
  for (const type of INVENTORY_TYPES) {
    const typeStartTime = Date.now();
    try {
      console.log(`Syncing inventory type: ${type}`);
      
      const response = await fetch(`${projectUrl}/functions/v1/sync-auctions?type=${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const durationMs = Date.now() - typeStartTime;
      
      if (response.ok) {
        const count = data.count || 0;
        results.push({ 
          type, 
          success: true, 
          count,
          duration_ms: durationMs
        });
        console.log(`✓ ${type}: synced ${count} auctions in ${durationMs}ms`);
        
        // Record successful sync in history
        await supabase.from('sync_history').insert({
          inventory_source: type,
          auctions_count: count,
          success: true,
          duration_ms: durationMs
        });
      } else {
        const errorMsg = data.error || 'Unknown error';
        results.push({ 
          type, 
          success: false, 
          error: errorMsg,
          duration_ms: durationMs
        });
        console.error(`✗ ${type}: ${errorMsg}`);
        
        // Record failed sync in history
        await supabase.from('sync_history').insert({
          inventory_source: type,
          auctions_count: 0,
          success: false,
          error_message: errorMsg,
          duration_ms: durationMs
        });
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: unknown) {
      const durationMs = Date.now() - typeStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ 
        type, 
        success: false, 
        error: errorMessage,
        duration_ms: durationMs
      });
      console.error(`✗ ${type}: ${errorMessage}`);
      
      // Record error in history
      await supabase.from('sync_history').insert({
        inventory_source: type,
        auctions_count: 0,
        success: false,
        error_message: errorMessage,
        duration_ms: durationMs
      });
    }
  }

  // Now sync large inventory types using the specialized function
  console.log(`Syncing ${LARGE_INVENTORY_TYPES.length} large inventory sources...`);
  
  for (const type of LARGE_INVENTORY_TYPES) {
    const typeStartTime = Date.now();
    try {
      console.log(`Syncing large inventory type: ${type}`);
      
      const response = await fetch(`${projectUrl}/functions/v1/sync-large-inventory?type=${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const durationMs = Date.now() - typeStartTime;
      
      if (response.ok && data.success) {
        const count = data.count || data.totalUpserted || 0;
        results.push({ 
          type, 
          success: true, 
          count,
          duration_ms: durationMs
        });
        console.log(`✓ ${type}: synced ${count} auctions in ${durationMs}ms`);
        
        await supabase.from('sync_history').insert({
          inventory_source: type,
          auctions_count: count,
          success: true,
          duration_ms: durationMs
        });
      } else {
        const errorMsg = data.error || 'Unknown error';
        results.push({ 
          type, 
          success: false, 
          error: errorMsg,
          duration_ms: durationMs
        });
        console.error(`✗ ${type}: ${errorMsg}`);
        
        await supabase.from('sync_history').insert({
          inventory_source: type,
          auctions_count: 0,
          success: false,
          error_message: errorMsg,
          duration_ms: durationMs
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for large files
      
    } catch (error: unknown) {
      const durationMs = Date.now() - typeStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ 
        type, 
        success: false, 
        error: errorMessage,
        duration_ms: durationMs
      });
      console.error(`✗ ${type}: ${errorMessage}`);
      
      await supabase.from('sync_history').insert({
        inventory_source: type,
        auctions_count: 0,
        success: false,
        error_message: errorMessage,
        duration_ms: durationMs
      });
    }
  }

  const allTypes = [...INVENTORY_TYPES, ...LARGE_INVENTORY_TYPES];
  const duration = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const totalSynced = results.reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`Sync complete: ${successful}/${allTypes.length} sources, ${totalSynced} total auctions in ${duration}s`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Synced ${successful}/${allTypes.length} inventory sources`,
      totalAuctions: totalSynced,
      duration: `${duration}s`,
      results
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
});