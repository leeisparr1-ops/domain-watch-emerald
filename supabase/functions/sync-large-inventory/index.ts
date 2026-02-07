import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';

// Use the SMALLER paginated files that edge functions CAN handle
// These are subsets of the large files, updated frequently
const MANAGEABLE_INVENTORY_FILES: Record<string, { file: string; description: string }> = {
  // These are small enough for edge functions (<5MB compressed)
  featured: { file: 'featured_listings.json.zip', description: 'Featured domains' },
  mostActive: { file: 'most_active_auctions.json.zip', description: 'Most active auctions' },
  endingTomorrow: { file: 'auctions_ending_tomorrow.json.zip', description: 'Ending tomorrow' },
  endingToday: { file: 'auctions_ending_today.json.zip', description: 'Ending today' },
  fiveLetter: { file: 'five_letter_auctions.json.zip', description: '5-letter domains' },
  withPageviews: { file: 'domains_with_pageviews.json.zip', description: 'With traffic' },
  recent: { file: 'recent_auctions.json.zip', description: 'Recently listed' },
  listings: { file: 'listings.json.zip', description: 'Buy-now listings' },
  listings2: { file: 'listings2.json.zip', description: 'More listings' },
  nonAdultListings: { file: 'non_adult_listings.json.zip', description: 'Non-adult listings' },
  nonAdultListings2: { file: 'non_adult_listings2.json.zip', description: 'More non-adult' },
};

// Large files - these need special handling with byte-range requests
const LARGE_INVENTORY_FILES: Record<string, { file: string; description: string; sizeEstimate: string }> = {
  closeout: { file: 'closeout_listings.json.zip', description: 'Closeout domains', sizeEstimate: '~8MB' },
  allExpiring: { file: 'all_expiring_auctions.json.zip', description: 'All expiring', sizeEstimate: '~15MB' },
  allListings: { file: 'all_listings.json.zip', description: 'All listings', sizeEstimate: '~20MB' },
  allBiddable: { file: 'all_biddable_auctions.json.zip', description: 'All biddable', sizeEstimate: '~10MB' },
};

const BATCH_SIZE = 500;
const MAX_DOWNLOAD_SIZE = 8 * 1024 * 1024; // 8MB max download
const MAX_DECOMPRESSED = 20 * 1024 * 1024; // 20MB decompressed limit
const MAX_EXECUTION_TIME = 45000; // 45 seconds

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

// Stream download with size limit and byte-range support
async function downloadWithByteRange(
  url: string, 
  startByte: number, 
  maxSize: number
): Promise<{ data: Uint8Array; totalSize: number | null; isComplete: boolean }> {
  console.log(`Downloading from ${url}, range: ${startByte}-${startByte + maxSize}`);
  
  const headers: Record<string, string> = {
    'Accept': '*/*',
    'User-Agent': 'DomainHawk/1.0',
  };
  
  // Only use range if not starting from 0
  if (startByte > 0) {
    headers['Range'] = `bytes=${startByte}-${startByte + maxSize - 1}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  // Parse content-range to get total size
  const contentRange = response.headers.get('content-range');
  let totalSize: number | null = null;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) totalSize = parseInt(match[1]);
  }
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const chunks: Uint8Array[] = [];
  let downloadedSize = 0;
  
  while (downloadedSize < maxSize) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    downloadedSize += value.length;
  }
  
  // Check if we got all the data
  const isComplete = response.status !== 206 || downloadedSize < maxSize;
  
  if (!isComplete) {
    await reader.cancel();
  }
  
  const result = new Uint8Array(downloadedSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  console.log(`Downloaded ${(downloadedSize / 1024 / 1024).toFixed(2)}MB, complete: ${isComplete}`);
  return { data: result, totalSize, isComplete };
}

// Streaming JSON extraction from ZIP
async function extractJsonFromZip(zipData: Uint8Array, maxDecompressed: number): Promise<string> {
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
  
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  
  // Feed compressed data in chunks
  const writePromise = (async () => {
    const CHUNK = 64 * 1024;
    for (let i = 0; i < compressedData.length; i += CHUNK) {
      await writer.write(compressedData.slice(i, i + CHUNK));
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
  
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  chunks.length = 0; // Free memory
  return new TextDecoder().decode(result);
}

// Parse potentially truncated JSON
function parseJsonArray(text: string): any[] {
  // Try standard parse first
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || []);
  } catch {
    console.log('Standard parse failed, using incremental parser...');
  }
  
  // Incremental parse for truncated JSON
  const items: any[] = [];
  const startIdx = text.indexOf('[');
  if (startIdx === -1) return [];
  
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
          if (obj.domainName || obj.DomainName || obj.domain) {
            items.push(obj);
          }
        } catch {}
        objectStart = -1;
      }
    }
  }
  
  console.log(`Incremental parser found ${items.length} items`);
  return items;
}

serve(async (req) => {
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

  try {
    const url = new URL(req.url);
    const inventoryType = url.searchParams.get('type') || 'closeout';
    const mode = url.searchParams.get('mode') || 'auto'; // 'auto', 'manageable', 'large'
    
    const startTime = Date.now();
    
    // Check if it's a manageable file first
    const manageableConfig = MANAGEABLE_INVENTORY_FILES[inventoryType];
    const largeConfig = LARGE_INVENTORY_FILES[inventoryType];
    
    if (!manageableConfig && !largeConfig) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown inventory type: ${inventoryType}`,
          available: {
            manageable: Object.keys(MANAGEABLE_INVENTORY_FILES),
            large: Object.keys(LARGE_INVENTORY_FILES),
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const isLarge = !!largeConfig;
    const config = manageableConfig || largeConfig;
    const inventoryUrl = `${INVENTORY_BASE}/${config.file}`;
    
    console.log(`=== Syncing ${inventoryType} (${isLarge ? 'LARGE' : 'manageable'}) ===`);
    
    // Download file
    const { data: zipData, isComplete } = await downloadWithByteRange(
      inventoryUrl, 
      0, 
      MAX_DOWNLOAD_SIZE
    );
    
    if (!isComplete && isLarge) {
      console.log(`Large file ${inventoryType} truncated at ${MAX_DOWNLOAD_SIZE} bytes - processing partial data`);
    }
    
    // Decompress
    const jsonContent = await extractJsonFromZip(zipData, MAX_DECOMPRESSED);
    
    // Check time
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log('Approaching time limit, stopping early');
    }
    
    // Parse
    const rawAuctions = parseJsonArray(jsonContent);
    console.log(`Found ${rawAuctions.length} auctions`);
    
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
      // Check time before each batch
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`Time limit reached after ${totalUpserted} upserts`);
        break;
      }
      
      const batch = auctionsToUpsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('auctions')
        .upsert(batch, { onConflict: 'domain_name', ignoreDuplicates: false });
      
      if (error) {
        errors.push(error.message);
        console.error(`Batch error: ${error.message}`);
      } else {
        totalUpserted += batch.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Log to sync_history
    await supabase.from('sync_history').insert({
      inventory_source: inventoryType,
      success: errors.length === 0,
      auctions_count: totalUpserted,
      duration_ms: duration,
      error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    });
    
    console.log(`=== Done: ${totalUpserted} in ${(duration / 1000).toFixed(1)}s ===`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Synced ${totalUpserted} auctions from ${inventoryType}`,
        count: totalUpserted,
        found: rawAuctions.length,
        isLarge,
        wasComplete: isComplete,
        duration_ms: duration,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    
    // Log error
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const url = new URL(req.url);
    const inventoryType = url.searchParams.get('type') || 'closeout';
    
    await supabase.from('sync_history').insert({
      inventory_source: inventoryType,
      success: false,
      auctions_count: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
