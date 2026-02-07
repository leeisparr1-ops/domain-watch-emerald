import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All inventory types to sync - only verified working sources
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

// Large inventory types - handled by sync-large-inventory function with streaming/limits
// These contain the bulk of the domain listings
const LARGE_INVENTORY_TYPES = [
  'closeout',      // ~8.6MB - closeout deals
  'endingToday',   // ~10MB - urgent listings
  'allBiddable',   // ~19MB - active auctions
  'allExpiring',   // ~28MB - expiring domains
  'allListings',   // ~28MB - complete inventory
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: require SYNC_SECRET
  const syncSecret = Deno.env.get('SYNC_SECRET');
  const authHeader = req.headers.get('Authorization');
  const providedSecret = authHeader?.replace('Bearer ', '') || req.headers.get('X-Sync-Secret');
  if (!syncSecret || providedSecret !== syncSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Generate unique lock holder ID for this sync run
  const lockHolder = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Try to acquire the sync lock
  const { data: lockAcquired, error: lockError } = await supabase.rpc('acquire_sync_lock', {
    lock_holder: lockHolder,
    lock_duration_minutes: 15
  });

  if (lockError) {
    console.error('Failed to check sync lock:', lockError);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to check sync lock',
        details: lockError.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }

  if (!lockAcquired) {
    // Another sync is already running - skip this run
    console.log('Sync already in progress, skipping this run');
    
    // Get info about the current lock
    const { data: lockInfo } = await supabase.rpc('is_sync_locked');
    
    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        message: 'Sync already in progress, skipping to prevent database overload',
        currentLock: lockInfo?.[0] || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }

  console.log(`Acquired sync lock: ${lockHolder}`);

  const overallStartTime = Date.now();
  const results: { type: string; success: boolean; count?: number; error?: string; duration_ms?: number }[] = [];
  
  console.log(`Starting scheduled sync for ${INVENTORY_TYPES.length} inventory sources...`);

  const projectUrl = supabaseUrl;
  
  try {
    // Process each inventory type sequentially to avoid overwhelming the system
    for (const type of INVENTORY_TYPES) {
      const typeStartTime = Date.now();
      try {
        console.log(`Syncing inventory type: ${type}`);
        
        const response = await fetch(`${projectUrl}/functions/v1/sync-auctions?type=${type}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${syncSecret}`,
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
        
        // Longer delay between requests to prevent DB saturation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
            'Authorization': `Bearer ${syncSecret}`,
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
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Much longer delay for large files
        
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

    // IMPORTANT: Do expensive follow-up work ONCE per full sync run.
    // Previously, sync-auctions triggered pattern checks/cleanup after every source,
    // which created sustained DB load and could starve authentication (/token) requests.
    const totalSyncedSoFar = results.reduce((sum, r) => sum + (r.count || 0), 0);
    if (totalSyncedSoFar > 0) {
      try {
        console.log('Running one-time cleanup of expired auctions...');
        await fetch(`${projectUrl}/functions/v1/cleanup-expired-auctions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${syncSecret}`,
          },
        });
      } catch (e) {
        console.error('Cleanup step failed (non-fatal):', e);
      }

      try {
        console.log('Running one-time pattern check for all users...');
        await fetch(`${projectUrl}/functions/v1/check-all-patterns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${syncSecret}`,
          },
        });
      } catch (e) {
        console.error('Pattern check failed (non-fatal):', e);
      }
    }
  } finally {
    // Always release the lock when done
    const { error: releaseError } = await supabase.rpc('release_sync_lock', {
      lock_holder: lockHolder
    });
    
    if (releaseError) {
      console.error('Failed to release sync lock:', releaseError);
    } else {
      console.log(`Released sync lock: ${lockHolder}`);
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