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
const CHUNK_SIZE = 50000; // Process 50k domains per call

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

// Stream download
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

// Streaming JSON parser - yields items one at a time
function* parseJsonArrayStreaming(text: string): Generator<any> {
  const startIdx = text.indexOf('[');
  if (startIdx === -1) return;
  
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escape = false;
  
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    
    if (escape) { escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    
    if (char === '{') {
      if (depth === 1) objectStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 1 && objectStart !== -1) {
        try {
          const obj = JSON.parse(text.substring(objectStart, i + 1));
          yield obj;
        } catch {}
        objectStart = -1;
      }
    }
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
  
  // Get offset from query params
  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    console.log(`=== Closeout Sync (offset: ${offset}) ===`);
    
    // Download the ZIP
    const zipData = await downloadFile(CLOSEOUT_URL);
    
    // Decompress using fflate
    console.log('Decompressing...');
    const unzipped = unzipSync(zipData);
    const fileName = Object.keys(unzipped)[0];
    const jsonData = unzipped[fileName];
    console.log(`Decompressed: ${(jsonData.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Convert to string
    const decoder = new TextDecoder();
    const jsonContent = decoder.decode(jsonData);
    
    // Free ZIP memory
    // @ts-ignore
    unzipped[fileName] = null;
    
    // Parse and process only our chunk
    console.log(`Parsing from offset ${offset}, chunk size ${CHUNK_SIZE}...`);
    
    let totalUpserted = 0;
    let totalFound = 0;
    let skipped = 0;
    const errors: string[] = [];
    let batch: any[] = [];
    
    for (const item of parseJsonArrayStreaming(jsonContent)) {
      totalFound++;
      
      // Skip items before our offset
      if (totalFound <= offset) {
        skipped++;
        continue;
      }
      
      // Stop after processing our chunk
      if (totalFound > offset + CHUNK_SIZE) {
        break;
      }
      
      const domainName = item.domainName || item.DomainName || item.domain || item.name || '';
      if (!domainName) continue;
      
      batch.push({
        domain_name: domainName,
        price: parsePrice(item.price || item.Price || item.currentPrice || item.buyNowPrice || '0'),
        bid_count: parseInt(item.numberOfBids || item.bids || item.bidCount || 0) || 0,
        traffic_count: parseInt(item.pageviews || item.traffic || 0) || 0,
        end_time: item.auctionEndTime || item.endTime || null,
        valuation: parsePrice(item.valuation || item.estimatedValue || '0'),
        auction_type: 'closeout',
        domain_age: parseInt(item.domainAge || item.age || 0) || 0,
        tld: extractTld(domainName),
        inventory_source: 'closeout',
      });
      
      // Flush batch
      if (batch.length >= BATCH_SIZE) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          console.log(`Time limit after ${totalUpserted}`);
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
        
        batch = [];
        
        if (totalUpserted % 10000 === 0) console.log(`Progress: ${totalUpserted}`);
      }
    }
    
    // Flush remaining
    if (batch.length > 0) {
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
    const hasMore = totalFound > offset + CHUNK_SIZE;
    const nextOffset = hasMore ? offset + CHUNK_SIZE : null;
    
    // Log to sync_history
    await supabase.from('sync_history').insert({
      inventory_source: `closeout_chunk_${Math.floor(offset / CHUNK_SIZE)}`,
      success: errors.length === 0,
      auctions_count: totalUpserted,
      duration_ms: duration,
      error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    });
    
    console.log(`=== Done: ${totalUpserted} in ${(duration / 1000).toFixed(1)}s, hasMore: ${hasMore} ===`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Synced ${totalUpserted} closeout auctions`,
        count: totalUpserted,
        found: totalFound,
        offset,
        hasMore,
        nextOffset,
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
