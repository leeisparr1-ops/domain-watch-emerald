import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';

// Large inventory files - download full files with memory limits
const LARGE_INVENTORY_FILES: Record<string, string> = {
  closeout: 'closeout_listings.json.zip',
  endingToday: 'all_listings_ending_today.json.zip',
  allBiddable: 'all_biddable_auctions.json.zip',
  allExpiring: 'all_expiring_auctions.json.zip',
  allListings: 'all_listings.json.zip',
};

// Max file size to download (10MB compressed should give us plenty of data)
const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024;
// Max auctions to extract per file
const MAX_AUCTIONS = 10000;

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
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'DomainPulse/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (totalSize < maxSize) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    totalSize += value.length;
    
    // Log progress every 2MB
    if (totalSize % (2 * 1024 * 1024) < value.length) {
      console.log(`Downloaded ${(totalSize / 1024 / 1024).toFixed(1)}MB...`);
    }
  }

  // Cancel remaining data if we hit limit
  if (totalSize >= maxSize) {
    await reader.cancel();
    console.log(`Download stopped at ${(totalSize / 1024 / 1024).toFixed(1)}MB limit`);
  }

  // Combine chunks
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Extract JSON from ZIP with full file (proper decompression)
async function extractJsonFromZip(zipData: Uint8Array): Promise<string> {
  const view = new DataView(zipData.buffer);
  
  // Verify ZIP signature
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Invalid ZIP file signature');
  }
  
  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const fileNameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  
  const dataStart = 30 + fileNameLength + extraFieldLength;
  
  // Handle case where we might not have complete file
  const availableData = zipData.length - dataStart;
  const actualCompressedSize = Math.min(compressedSize, availableData);
  const compressedData = zipData.slice(dataStart, dataStart + actualCompressedSize);
  
  console.log(`ZIP: compression=${compressionMethod}, compressedSize=${compressedSize}, available=${availableData}`);
  
  let jsonData: Uint8Array;
  
  if (compressionMethod === 0) {
    // Stored (no compression)
    jsonData = compressedData;
  } else if (compressionMethod === 8) {
    // Deflate compression
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    
    // Write data in chunks to avoid blocking
    const CHUNK_SIZE = 512 * 1024; // 512KB chunks
    const writePromise = (async () => {
      for (let i = 0; i < compressedData.length; i += CHUNK_SIZE) {
        const chunk = compressedData.slice(i, Math.min(i + CHUNK_SIZE, compressedData.length));
        await writer.write(chunk);
      }
      await writer.close();
    })();
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const MAX_DECOMPRESSED = 100 * 1024 * 1024; // 100MB limit
    
    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalSize += value.length;
        
        if (totalSize > MAX_DECOMPRESSED) {
          console.log(`Decompression stopped at ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
          break;
        }
      } catch (e) {
        // Decompression may fail if we have truncated data
        console.log(`Decompression stopped: ${e}`);
        break;
      }
    }
    
    await writePromise.catch(() => {}); // Ignore write errors if reader cancelled
    
    jsonData = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      if (offset + chunk.length > totalSize) break;
      jsonData.set(chunk, offset);
      offset += chunk.length;
    }
  } else {
    throw new Error(`Unsupported compression method: ${compressionMethod}`);
  }
  
  return new TextDecoder().decode(jsonData);
}

// Parse JSON array incrementally, handling truncated data
function parseJsonArray(text: string, maxItems: number): any[] {
  const auctions: any[] = [];
  
  // Try standard JSON parse first
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || parsed.data || []);
    return arr.slice(0, maxItems);
  } catch (e) {
    // JSON is likely truncated, parse incrementally
    console.log('Standard JSON parse failed, trying incremental parse...');
  }
  
  // Find the start of the array
  let startIdx = text.indexOf('[');
  if (startIdx === -1) {
    // Try to find individual objects
    startIdx = text.indexOf('{');
    if (startIdx === -1) return [];
  }
  
  // Parse objects one by one
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < text.length && auctions.length < maxItems; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      if (depth === 0 || (depth === 1 && objectStart === -1)) {
        objectStart = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 1 && objectStart !== -1) {
        // Complete object found
        const objStr = text.substring(objectStart, i + 1);
        try {
          const obj = JSON.parse(objStr);
          if (obj.domainName || obj.DomainName || obj.domain) {
            auctions.push(obj);
          }
        } catch (e) {
          // Skip malformed object
        }
        objectStart = -1;
      }
    }
  }
  
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
        JSON.stringify({ success: false, error: `Unknown inventory type: ${inventoryType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const inventoryUrl = `${INVENTORY_BASE}/${inventoryFile}`;
    console.log(`Syncing large inventory from: ${inventoryUrl} (type: ${inventoryType})`);

    // Download with size limit
    const startTime = Date.now();
    const zipData = await downloadWithLimit(inventoryUrl, MAX_DOWNLOAD_SIZE);
    console.log(`Downloaded ${(zipData.length / 1024 / 1024).toFixed(2)}MB in ${Date.now() - startTime}ms`);

    // Extract and decompress
    const jsonContent = await extractJsonFromZip(zipData);
    console.log(`Decompressed to ${(jsonContent.length / 1024 / 1024).toFixed(2)}MB of JSON`);

    // Parse auctions
    const rawAuctions = parseJsonArray(jsonContent, MAX_AUCTIONS);
    console.log(`Parsed ${rawAuctions.length} auctions from ${inventoryType}`);

    return await processAuctions(supabase, rawAuctions, inventoryType, corsHeaders);

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processAuctions(
  supabase: any, 
  rawAuctions: any[], 
  inventoryType: string, 
  corsHeaders: Record<string, string>
) {
  const auctionsToUpsert = rawAuctions
    .filter((item: any) => item.domainName || item.DomainName || item.domain)
    .map((item: any) => ({
      domain_name: item.domainName || item.DomainName || item.domain || item.dn || item.name || '',
      price: parsePrice(item.price || item.Price || item.currentPrice || item.minBid || '0'),
      bid_count: parseInt(item.numberOfBids || item.NumberOfBids || item.bids || 0),
      traffic_count: parseInt(item.pageviews || item.traffic || item.Traffic || 0),
      end_time: item.auctionEndTime || item.AuctionEndTime || item.endTime || null,
      valuation: parsePrice(item.valuation || item.Valuation || '0'),
      auction_type: item.auctionType || item.AuctionType || item.type || 'auction',
      domain_age: parseInt(item.domainAge || item.DomainAge || 0),
      tld: extractTld(item.domainName || item.DomainName || item.domain || ''),
      inventory_source: inventoryType,
    }));

  console.log(`Prepared ${auctionsToUpsert.length} auctions for upsert`);

  const batchSize = 500;
  let totalUpserted = 0;
  let errors: string[] = [];

  for (let i = 0; i < auctionsToUpsert.length; i += batchSize) {
    const batch = auctionsToUpsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('auctions')
      .upsert(batch, { 
        onConflict: 'domain_name',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error);
      errors.push(error.message);
    } else {
      totalUpserted += batch.length;
    }
  }

  console.log(`Sync complete: ${totalUpserted} auctions synced from ${inventoryType}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Synced ${totalUpserted} auctions from ${inventoryType}`,
      totalProcessed: rawAuctions.length,
      totalUpserted,
      count: totalUpserted,
      errors: errors.length > 0 ? errors : undefined,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
