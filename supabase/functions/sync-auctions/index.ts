import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';
const INVENTORY_FILES = {
  endingToday: 'all_listings_ending_today.json.zip',
  endingTomorrow: 'all_listings_ending_tomorrow.json.zip',
  allBiddable: 'all_biddable_auctions.json.zip',
  allExpiring: 'all_expiring_auctions.json.zip',
  allListings: 'all_listings.json.zip',
  fiveLetter: '5_letter_auctions.json.zip',
};

// Process ZIP in streaming chunks to reduce memory usage
async function* streamJsonArrayFromZip(zipData: Uint8Array): AsyncGenerator<any> {
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
  
  let jsonStream: ReadableStream<Uint8Array>;
  
  if (compressionMethod === 0) {
    jsonStream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      }
    });
  } else if (compressionMethod === 8) {
    const ds = new DecompressionStream('deflate-raw');
    const inputStream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      }
    });
    jsonStream = inputStream.pipeThrough(ds);
  } else {
    throw new Error(`Unsupported compression method: ${compressionMethod}`);
  }

  // Stream-parse the JSON array
  const reader = jsonStream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let depth = 0;
  let inString = false;
  let escape = false;
  let objectStart = -1;
  let foundArray = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process buffer character by character
    let i = 0;
    while (i < buffer.length) {
      const char = buffer[i];
      
      if (escape) {
        escape = false;
        i++;
        continue;
      }
      
      if (char === '\\' && inString) {
        escape = true;
        i++;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        i++;
        continue;
      }
      
      if (inString) {
        i++;
        continue;
      }
      
      if (char === '[' && !foundArray) {
        foundArray = true;
        i++;
        continue;
      }
      
      if (char === '{') {
        if (depth === 0) {
          objectStart = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && objectStart !== -1) {
          const objectStr = buffer.substring(objectStart, i + 1);
          try {
            yield JSON.parse(objectStr);
          } catch {
            // Skip malformed objects
          }
          objectStart = -1;
        }
      }
      
      i++;
    }
    
    // Keep only unprocessed part of buffer
    if (objectStart !== -1) {
      buffer = buffer.substring(objectStart);
      objectStart = 0;
    } else {
      buffer = '';
    }
  }
}

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

function transformAuction(item: any, inventoryType: string) {
  const domainName = item.domainName || item.DomainName || item.domain || item.dn || item.name || '';
  if (!domainName) return null;
  
  return {
    domain_name: domainName,
    price: parsePrice(item.price || item.Price || item.currentPrice || item.minBid || '0'),
    bid_count: parseInt(item.numberOfBids || item.NumberOfBids || item.bids || 0),
    traffic_count: parseInt(item.pageviews || item.traffic || item.Traffic || 0),
    end_time: item.auctionEndTime || item.AuctionEndTime || item.endTime || null,
    valuation: parsePrice(item.valuation || item.Valuation || '0'),
    auction_type: item.auctionType || item.AuctionType || item.type || 'auction',
    domain_age: parseInt(item.domainAge || item.DomainAge || 0),
    tld: extractTld(domainName),
    inventory_source: inventoryType,
  };
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
    const inventoryType = url.searchParams.get('type') || 'endingToday';
    
    const inventoryFile = INVENTORY_FILES[inventoryType as keyof typeof INVENTORY_FILES] || INVENTORY_FILES.endingToday;
    const inventoryUrl = `${INVENTORY_BASE}/${inventoryFile}`;

    console.log(`Syncing auctions from: ${inventoryUrl}`);

    const response = await fetch(inventoryUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'DomainPulse/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`);
    }

    const zipData = new Uint8Array(await response.arrayBuffer());
    console.log(`Downloaded ${zipData.length} bytes`);
    
    // Process in streaming batches to minimize memory
    const batchSize = 200;
    let batch: any[] = [];
    let totalProcessed = 0;
    let totalUpserted = 0;
    let errors: string[] = [];

    for await (const item of streamJsonArrayFromZip(zipData)) {
      const auction = transformAuction(item, inventoryType);
      if (auction) {
        batch.push(auction);
        totalProcessed++;
        
        if (batch.length >= batchSize) {
          const { error } = await supabase
            .from('auctions')
            .upsert(batch, { 
              onConflict: 'domain_name',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Batch error:`, error.message);
            errors.push(error.message);
          } else {
            totalUpserted += batch.length;
          }
          
          batch = [];
          
          // Log progress every 2000 records
          if (totalProcessed % 2000 === 0) {
            console.log(`Processed ${totalProcessed} auctions...`);
          }
        }
      }
    }

    // Upsert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase
        .from('auctions')
        .upsert(batch, { 
          onConflict: 'domain_name',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Final batch error:`, error.message);
        errors.push(error.message);
      } else {
        totalUpserted += batch.length;
      }
    }

    console.log(`Sync complete: ${totalUpserted}/${totalProcessed} auctions from ${inventoryType}`);

    // Clean up old expired auctions (older than 7 days)
    const { error: cleanupError } = await supabase
      .from('auctions')
      .delete()
      .lt('end_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${totalUpserted} auctions from ${inventoryType}`,
        totalProcessed,
        totalUpserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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
