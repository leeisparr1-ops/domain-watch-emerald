import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLOSEOUT_URL = 'https://inventory.auctions.godaddy.com/closeout_listings.json.zip';
const BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME = 50000;

function extractTld(domain: string): string {
  const parts = domain.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

function parsePrice(priceRaw: string | number): number {
  if (typeof priceRaw === 'string') {
    return parseFloat(priceRaw.replace(/[$,]/g, '')) || 0;
  }
  return parseFloat(String(priceRaw)) || 0;
}

// Stream download in chunks to limit memory
async function downloadFile(url: string): Promise<Uint8Array> {
  console.log(`Downloading ${url}...`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (compatible; DomainHawk/1.0)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  console.log(`Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
  return new Uint8Array(buffer);
}

// Parse JSON and extract auctions
function parseAuctions(text: string): any[] {
  try {
    const parsed = JSON.parse(text);
    
    // Try different known formats
    if (Array.isArray(parsed)) return parsed;
    if (parsed.auctions) return parsed.auctions;
    if (parsed.listings) return parsed.listings;
    if (parsed.items) return parsed.items;
    if (parsed.domains) return parsed.domains;
    if (parsed.data) return Array.isArray(parsed.data) ? parsed.data : [];
    
    // Object with domain keys
    const values = Object.values(parsed);
    if (values.length > 0 && typeof values[0] === 'object') {
      return values as any[];
    }
    
    return [];
  } catch (e) {
    console.error('JSON parse failed:', e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const startTime = Date.now();

  try {
    console.log('=== Starting Closeout Sync ===');
    
    // Download the ZIP
    const zipData = await downloadFile(CLOSEOUT_URL);
    
    // Decompress using fflate (more memory efficient)
    console.log('Decompressing...');
    const unzipped = unzipSync(zipData);
    const fileName = Object.keys(unzipped)[0];
    const jsonData = unzipped[fileName];
    console.log(`Decompressed: ${(jsonData.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Convert to string in chunks to reduce memory pressure
    const decoder = new TextDecoder();
    const jsonContent = decoder.decode(jsonData);
    
    // Free memory
    // @ts-ignore - Allow garbage collection
    unzipped[fileName] = null;
    
    // Parse and transform
    console.log('Parsing...');
    const rawAuctions = parseAuctions(jsonContent);
    console.log(`Found ${rawAuctions.length} raw items, first keys: ${rawAuctions[0] ? Object.keys(rawAuctions[0]).slice(0,5).join(',') : 'none'}`);
    
    const auctionsToUpsert = rawAuctions
      .filter((item: any) => item.domainName || item.DomainName || item.domain || item.name)
      .map((item: any) => ({
        domain_name: item.domainName || item.DomainName || item.domain || item.name || '',
        price: parsePrice(item.price || item.Price || item.currentPrice || item.buyNowPrice || '0'),
        bid_count: parseInt(item.numberOfBids || item.bids || item.bidCount || 0) || 0,
        traffic_count: parseInt(item.pageviews || item.traffic || 0) || 0,
        end_time: item.auctionEndTime || item.endTime || null,
        valuation: parsePrice(item.valuation || item.estimatedValue || '0'),
        auction_type: 'closeout',
        domain_age: parseInt(item.domainAge || item.age || 0) || 0,
        tld: extractTld(item.domainName || item.DomainName || item.domain || item.name || ''),
        inventory_source: 'closeout',
      }));

    console.log(`Upserting ${auctionsToUpsert.length} auctions...`);
    
    let totalUpserted = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < auctionsToUpsert.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`Time limit after ${totalUpserted}`);
        break;
      }
      
      const batch = auctionsToUpsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('auctions')
        .upsert(batch, { onConflict: 'domain_name', ignoreDuplicates: false });
      
      if (error) {
        errors.push(error.message);
      } else {
        totalUpserted += batch.length;
      }
      
      if (totalUpserted % 10000 === 0) console.log(`Progress: ${totalUpserted}`);
      
      // Flush batch
      if (batch.length >= BATCH_SIZE) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          console.log(`Time limit reached after ${totalUpserted} upserts`);
          break;
        }
        
        const { error } = await supabase
          .from('auctions')
          .upsert(batch, { onConflict: 'domain_name', ignoreDuplicates: false });
        
        if (error) {
          errors.push(error.message);
        } else {
          totalUpserted += batch.length;
        }
        
        if (totalUpserted % 10000 === 0) {
          console.log(`Progress: ${totalUpserted}`);
        }
        
        batch = [];
      }
    }
    
    // Flush remaining
    if (batch.length > 0 && Date.now() - startTime <= MAX_EXECUTION_TIME) {
      const { error } = await supabase
        .from('auctions')
        .upsert(batch, { onConflict: 'domain_name', ignoreDuplicates: false });
      
      if (error) {
        errors.push(error.message);
      } else {
        totalUpserted += batch.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Log to sync_history
    await supabase.from('sync_history').insert({
      inventory_source: 'closeout',
      success: errors.length === 0,
      auctions_count: totalUpserted,
      duration_ms: duration,
      error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    });
    
    console.log(`=== Closeout Sync Complete: ${totalUpserted}/${totalFound} in ${(duration / 1000).toFixed(1)}s ===`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Synced ${totalUpserted} closeout auctions`,
        count: totalUpserted,
        found: totalFound,
        duration_ms: duration,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Closeout sync error:', error);
    
    const duration = Date.now() - startTime;
    
    await supabase.from('sync_history').insert({
      inventory_source: 'closeout',
      success: false,
      auctions_count: 0,
      duration_ms: duration,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
