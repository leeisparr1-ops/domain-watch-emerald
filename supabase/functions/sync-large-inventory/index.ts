import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';

// Large inventory files - we'll fetch partial data using Range headers
const LARGE_INVENTORY_FILES: Record<string, string> = {
  closeout: 'closeout_listings.json.zip',
  expiring: 'expiring_listings.json.zip',
  endingToday: 'all_listings_ending_today.json.zip',
  allBiddable: 'all_biddable_auctions.json.zip',
  allExpiring: 'all_expiring_auctions.json.zip',
  allListings: 'all_listings.json.zip',
};

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

// Try to extract data from a partial/corrupted JSON by finding valid auction objects
function extractPartialAuctions(text: string): any[] {
  const auctions: any[] = [];
  
  // Pattern to match auction objects - look for domainName field
  const domainPattern = /"(?:domainName|DomainName|domain)"\s*:\s*"([^"]+\.[a-zA-Z]+)"/g;
  let match;
  
  // Find all potential auction objects
  const lines = text.split('\n');
  let currentObject = '';
  let braceCount = 0;
  let inObject = false;
  
  for (const line of lines) {
    if (line.includes('"domainName"') || line.includes('"DomainName"') || line.includes('"domain"')) {
      // Start of a new auction object - find the opening brace
      const objStart = line.lastIndexOf('{', line.indexOf('domain'));
      if (objStart !== -1) {
        currentObject = line.substring(objStart);
        braceCount = (currentObject.match(/{/g) || []).length - (currentObject.match(/}/g) || []).length;
        inObject = true;
      }
    } else if (inObject) {
      currentObject += '\n' + line;
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount <= 0) {
        // Try to parse the object
        try {
          // Clean up the object string
          let objStr = currentObject.trim();
          if (objStr.endsWith(',')) objStr = objStr.slice(0, -1);
          const obj = JSON.parse(objStr);
          if (obj.domainName || obj.DomainName || obj.domain) {
            auctions.push(obj);
          }
        } catch (e) {
          // Skip malformed objects
        }
        inObject = false;
        currentObject = '';
      }
    }
    
    // Limit to prevent memory issues
    if (auctions.length >= 5000) break;
  }
  
  return auctions;
}

async function extractJsonFromZip(zipData: Uint8Array): Promise<string> {
  const view = new DataView(zipData.buffer);
  
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Invalid ZIP file signature');
  }
  
  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const fileNameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  
  const dataStart = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipData.slice(dataStart, dataStart + compressedSize);
  
  let jsonData: Uint8Array;
  
  if (compressionMethod === 0) {
    jsonData = compressedData;
  } else if (compressionMethod === 8) {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    
    writer.write(compressedData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit for decompressed data
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
      
      // Stop if we hit memory limit
      if (totalSize > MAX_SIZE) {
        console.log(`Stopping decompression at ${totalSize} bytes to preserve memory`);
        break;
      }
    }
    
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

    // Try to fetch with a size limit using Range header
    const response = await fetch(inventoryUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'DomainPulse/1.0',
        'Range': 'bytes=0-3145728', // First 3MB only
      },
    });

    if (!response.ok && response.status !== 206) {
      // If range not supported, try full fetch but with timeout
      console.log('Range request not supported, trying full fetch...');
      const fullResponse = await fetch(inventoryUrl, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'DomainPulse/1.0',
        },
      });
      
      if (!fullResponse.ok) {
        throw new Error(`Failed to fetch inventory: ${fullResponse.status}`);
      }
      
      const zipData = new Uint8Array(await fullResponse.arrayBuffer());
      console.log(`Downloaded ${zipData.length} bytes (full file)`);
      
      let jsonContent: string;
      let rawAuctions: any[] = [];
      
      try {
        jsonContent = await extractJsonFromZip(zipData);
        const parsed = JSON.parse(jsonContent);
        rawAuctions = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || parsed.data || []);
      } catch (parseError) {
        console.log('JSON parse failed, trying partial extraction...');
        // Try to extract partial data
        try {
          jsonContent = await extractJsonFromZip(zipData);
          rawAuctions = extractPartialAuctions(jsonContent);
        } catch (e) {
          throw new Error(`Failed to parse inventory data: ${parseError}`);
        }
      }
      
      console.log(`Extracted ${rawAuctions.length} auctions from ${inventoryType}`);
      
      // Limit to 5000 auctions per large file sync to manage memory
      const limitedAuctions = rawAuctions.slice(0, 5000);
      
      return await processAuctions(supabase, limitedAuctions, inventoryType, corsHeaders);
    }

    // Handle partial content (206)
    const zipData = new Uint8Array(await response.arrayBuffer());
    console.log(`Downloaded ${zipData.length} bytes (partial)`);

    let jsonContent: string;
    let rawAuctions: any[] = [];
    
    try {
      jsonContent = await extractJsonFromZip(zipData);
      const parsed = JSON.parse(jsonContent);
      rawAuctions = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || parsed.data || []);
    } catch (e) {
      console.log('Partial ZIP parse failed, trying text extraction...');
      // The partial download may have truncated the file
      try {
        jsonContent = await extractJsonFromZip(zipData);
        rawAuctions = extractPartialAuctions(jsonContent);
      } catch (e2) {
        // Even partial extraction failed
        console.log('Could not extract any data from partial download');
        rawAuctions = [];
      }
    }

    console.log(`Extracted ${rawAuctions.length} auctions from partial ${inventoryType}`);
    
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
