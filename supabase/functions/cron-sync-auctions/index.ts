import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All inventory types to sync
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: { type: string; success: boolean; count?: number; error?: string }[] = [];
  
  console.log(`Starting scheduled sync for ${INVENTORY_TYPES.length} inventory sources...`);

  const projectUrl = Deno.env.get('SUPABASE_URL') || 'https://orbygspxutudncbyipst.supabase.co';
  
  // Process each inventory type sequentially to avoid overwhelming the system
  for (const type of INVENTORY_TYPES) {
    try {
      console.log(`Syncing inventory type: ${type}`);
      
      const response = await fetch(`${projectUrl}/functions/v1/sync-auctions?type=${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        results.push({ 
          type, 
          success: true, 
          count: data.count || 0 
        });
        console.log(`✓ ${type}: synced ${data.count || 0} auctions`);
      } else {
        results.push({ 
          type, 
          success: false, 
          error: data.error || 'Unknown error' 
        });
        console.error(`✗ ${type}: ${data.error}`);
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ 
        type, 
        success: false, 
        error: errorMessage 
      });
      console.error(`✗ ${type}: ${errorMessage}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const totalSynced = results.reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`Sync complete: ${successful}/${INVENTORY_TYPES.length} sources, ${totalSynced} total auctions in ${duration}s`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Synced ${successful}/${INVENTORY_TYPES.length} inventory sources`,
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