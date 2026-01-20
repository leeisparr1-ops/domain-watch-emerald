import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Batch size for upserts
const BATCH_SIZE = 500;

// Large inventory files to sync - correct GoDaddy URLs
const INVENTORY_SOURCES = [
  { type: 'closeout', url: 'https://inventory.auctions.godaddy.com/closeout_listings.json.zip' },
  { type: 'allExpiring', url: 'https://inventory.auctions.godaddy.com/all_expiring_auctions.json.zip' },
  { type: 'allListings', url: 'https://inventory.auctions.godaddy.com/all_listings.json.zip' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: Array<{ type: string; success: boolean; count: number; error?: string }> = [];
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body for optional source filter
    let targetSource: string | null = null;
    try {
      const body = await req.json();
      targetSource = body?.source || null;
    } catch {
      // No body or invalid JSON, sync all sources
    }

    const sourcesToSync = targetSource 
      ? INVENTORY_SOURCES.filter(s => s.type === targetSource)
      : INVENTORY_SOURCES;

    for (const source of sourcesToSync) {
      console.log(`Starting sync for ${source.type}...`);
      
      try {
        // Download the zip file
        const response = await fetch(source.url);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }
        
        const zipData = await response.arrayBuffer();
        console.log(`Downloaded ${source.type}: ${(zipData.byteLength / 1024 / 1024).toFixed(2)}MB`);
        
        // Import fflate for decompression
        const { unzipSync } = await import('https://esm.sh/fflate@0.8.2');
        
        const unzipped = unzipSync(new Uint8Array(zipData));
        const jsonFileName = Object.keys(unzipped).find(name => name.endsWith('.json'));
        
        if (!jsonFileName) {
          throw new Error('No JSON file found in zip');
        }
        
        const jsonData = new TextDecoder().decode(unzipped[jsonFileName]);
        console.log(`Decompressed ${source.type}: ${(jsonData.length / 1024 / 1024).toFixed(2)}MB`);
        
        // Parse JSON - handle different GoDaddy structures
        let items: any[];
        const parsed = JSON.parse(jsonData);
        
        console.log('Parsed JSON - top level keys:', Object.keys(parsed));
        
        if (Array.isArray(parsed)) {
          items = parsed;
          console.log('Found root array');
        } else if (parsed.data) {
          // Handle { meta: {...}, data: [...] } or { data: { domains: [...] } }
          if (Array.isArray(parsed.data)) {
            items = parsed.data;
            console.log('Found data array');
          } else if (parsed.data.domains && Array.isArray(parsed.data.domains)) {
            items = parsed.data.domains;
            console.log('Found data.domains array');
          } else if (parsed.data.listings && Array.isArray(parsed.data.listings)) {
            items = parsed.data.listings;
            console.log('Found data.listings array');
          } else if (parsed.data.auctions && Array.isArray(parsed.data.auctions)) {
            items = parsed.data.auctions;
            console.log('Found data.auctions array');
          } else {
            console.log('Data structure:', typeof parsed.data, Object.keys(parsed.data || {}));
            throw new Error(`Unknown data structure. Data keys: ${Object.keys(parsed.data || {}).join(', ')}`);
          }
        } else if (parsed.domains && Array.isArray(parsed.domains)) {
          items = parsed.domains;
          console.log('Found domains array');
        } else if (parsed.listings && Array.isArray(parsed.listings)) {
          items = parsed.listings;
          console.log('Found listings array');
        } else if (parsed.auctions && Array.isArray(parsed.auctions)) {
          items = parsed.auctions;
          console.log('Found auctions array');
        } else if (parsed.items && Array.isArray(parsed.items)) {
          items = parsed.items;
          console.log('Found items array');
        } else {
          // Log the structure to help debug
          console.log('Unknown structure - keys:', Object.keys(parsed));
          if (parsed.data) {
            console.log('Data type:', typeof parsed.data);
          }
          throw new Error(`Unknown JSON structure. Keys: ${Object.keys(parsed).join(', ')}`);
        }
        
        console.log(`Parsed ${items.length} items from ${source.type}`);
        
        // Transform and upsert in batches
        let totalUpserted = 0;
        
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE).map(item => {
            const domainName = (item.domainName || item.DomainName || item.domain || item.name || '').toLowerCase();
            const price = typeof item.price === 'string' 
              ? parseFloat(item.price.replace(/[$,]/g, '')) 
              : parseFloat(item.price || item.Price || item.currentPrice || item.minBid || '0') || 0;
            
            return {
              domain_name: domainName,
              price: price || 0,
              bid_count: parseInt(item.numberOfBids || item.NumberOfBids || item.bids || item.bidCount || '0') || 0,
              end_time: item.auctionEndTime || item.AuctionEndTime || item.endTime || item.expiryDate || null,
              traffic_count: parseInt(item.pageviews || item.traffic || item.Traffic || item.visitors || '0') || 0,
              valuation: parseFloat(item.valuation || item.Valuation || item.estibotValue || item.appraisal || '0') || null,
              domain_age: parseInt(item.domainAge || item.DomainAge || item.age || '0') || null,
              tld: domainName.includes('.') ? '.' + domainName.split('.').pop() : null,
              inventory_source: source.type,
              auction_type: item.auctionType || item.AuctionType || item.type || 'standard',
            };
          }).filter(a => a.domain_name && a.domain_name.length > 0);
          
          if (batch.length === 0) continue;
          
          const { error } = await supabase
            .from('auctions')
            .upsert(batch, { onConflict: 'domain_name', ignoreDuplicates: false });
          
          if (error) {
            console.error(`Batch error for ${source.type}:`, error.message);
          } else {
            totalUpserted += batch.length;
          }
          
          // Progress log every 10k
          if (totalUpserted % 10000 < BATCH_SIZE) {
            console.log(`${source.type}: ${totalUpserted}/${items.length}`);
          }
        }
        
        // Record sync history
        await supabase.from('sync_history').insert({
          inventory_source: source.type,
          auctions_count: totalUpserted,
          success: true,
          duration_ms: Date.now() - startTime,
        });
        
        results.push({ type: source.type, success: true, count: totalUpserted });
        console.log(`Completed ${source.type}: ${totalUpserted} domains`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed ${source.type}:`, errorMessage);
        
        // Record failure
        await supabase.from('sync_history').insert({
          inventory_source: source.type,
          auctions_count: 0,
          success: false,
          error_message: errorMessage,
          duration_ms: Date.now() - startTime,
        });
        
        results.push({ type: source.type, success: false, count: 0, error: errorMessage });
      }
    }
    
    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + r.count, 0);
    
    return new Response(JSON.stringify({
      success: true,
      results,
      totalSynced,
      durationMs: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Proxy sync failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
