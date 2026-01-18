import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';

// Large inventory files - optimized for edge function memory limits
const LARGE_INVENTORY_FILES: Record<string, string> = {
  closeout: 'closeout_listings.json.zip',           // ~8.6MB compressed
  endingToday: 'all_listings_ending_today.json.zip', // ~10MB compressed
  allBiddable: 'all_biddable_auctions.json.zip',    // ~19MB compressed
  allExpiring: 'all_expiring_auctions.json.zip',    // ~28MB compressed
  allListings: 'all_listings.json.zip',             // ~28MB compressed
};

// Conservative limits for edge function memory (~150MB total)
const MAX_DOWNLOAD_SIZE = 8 * 1024 * 1024; // 8MB compressed max
const MAX_AUCTIONS = 15000; // 15K domains per sync
const MAX_DECOMPRESSED = 40 * 1024 * 1024; // 40MB decompressed limit
const BATCH_SIZE = 500;

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

// Stream download with size limit
async function downloadWithLimit(url: string, maxSize: number): Promise<Uint8Array> {
  console.log(`Downloading from ${url}, max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'ExpiredHawk/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (totalSize < maxSize) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalSize += value.length;
  }

  if (totalSize >= maxSize) {
    await reader.cancel();
    console.log(`Download capped at ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
  }

  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  console.log(`Downloaded ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  return result;
}

// Streaming JSON extraction from ZIP with memory-efficient decompression
async function extractJsonFromZipStreaming(zipData: Uint8Array, maxDecompressed: number): Promise<string> {
  const view = new DataView(zipData.buffer);
  
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Invalid ZIP file signature');
  }
  
  const compressionMethod = view.getUint16(8, true);
  const fileNameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  const dataStart = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipData.slice(dataStart);
  
  console.log(`ZIP: method=${compressionMethod}, compressed=${(compressedData.length / 1024 / 1024).toFixed(2)}MB`);
  
  if (compressionMethod === 0) {
    return new TextDecoder().decode(compressedData.slice(0, maxDecompressed));
  }
  
  if (compressionMethod !== 8) {
    throw new Error(`Unsupported compression: ${compressionMethod}`);
  }
  
  // Deflate - decompress with limit
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  
  // Write in background
  const writePromise = (async () => {
    const CHUNK_SIZE = 512 * 1024;
    for (let i = 0; i < compressedData.length; i += CHUNK_SIZE) {
      await writer.write(compressedData.slice(i, i + CHUNK_SIZE));
    }
    await writer.close();
  })();
  
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  
  while (totalSize < maxDecompressed) {
    try {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    } catch {
      break;
    }
  }
  
  await writePromise.catch(() => {});
  
  console.log(`Decompressed ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Combine and decode
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new TextDecoder().decode(result);
}

// Memory-efficient incremental JSON parser
function parseJsonArrayIncremental(text: string, maxItems: number): any[] {
  // Try standard parse first
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || []);
    console.log(`Parsed ${arr.length} items (standard)`);
    return arr.slice(0, maxItems);
  } catch {
    console.log('Using incremental parser...');
  }
  
  // Incremental parse for truncated JSON
  const auctions: any[] = [];
  const startIdx = text.indexOf('[');
  if (startIdx === -1) return [];
  
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escape = false;
  
  for (let i = startIdx; i < text.length && auctions.length < maxItems; i++) {
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
          if (obj.domainName || obj.DomainName || obj.domain) {
            auctions.push(obj);
          }
        } catch {}
        objectStart = -1;
      }
    }
  }
  
  console.log(`Parsed ${auctions.length} items (incremental)`);
  return auctions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const inventoryType = url.searchParams.get('type') || 'closeout';
    
    const inventoryFile = LARGE_INVENTORY_FILES[inventoryType];
    if (!inventoryFile) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown type: ${inventoryType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const inventoryUrl = `${INVENTORY_BASE}/${inventoryFile}`;
    console.log(`=== Syncing: ${inventoryType} ===`);
    
    const startTime = Date.now();
    
    // Download
    const zipData = await downloadWithLimit(inventoryUrl, MAX_DOWNLOAD_SIZE);
    
    // Decompress with memory limit
    const jsonContent = await extractJsonFromZipStreaming(zipData, MAX_DECOMPRESSED);
    
    // Parse with limit
    const rawAuctions = parseJsonArrayIncremental(jsonContent, MAX_AUCTIONS);
    
    // Transform
    const auctionsToUpsert = rawAuctions
      .filter((item: any) => item.domainName || item.DomainName || item.domain)
      .map((item: any) => ({
        domain_name: item.domainName || item.DomainName || item.domain || '',
        price: parsePrice(item.price || item.Price || item.currentPrice || '0'),
        bid_count: parseInt(item.numberOfBids || item.bids || 0) || 0,
        traffic_count: parseInt(item.pageviews || item.traffic || 0) || 0,
        end_time: item.auctionEndTime || item.endTime || null,
        valuation: parsePrice(item.valuation || '0'),
        auction_type: item.auctionType || item.type || 'auction',
        domain_age: parseInt(item.domainAge || 0) || 0,
        tld: extractTld(item.domainName || item.DomainName || item.domain || ''),
        inventory_source: inventoryType,
      }));

    console.log(`Upserting ${auctionsToUpsert.length} auctions...`);
    
    // Batch upsert
    let totalUpserted = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < auctionsToUpsert.length; i += BATCH_SIZE) {
      const batch = auctionsToUpsert.slice(i, i + BATCH_SIZE);
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
    console.log(`=== Done: ${totalUpserted} auctions in ${(duration / 1000).toFixed(1)}s ===`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${totalUpserted} auctions from ${inventoryType}`,
        count: totalUpserted,
        totalProcessed: rawAuctions.length,
        totalUpserted,
        duration_ms: duration,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
