import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';

// Inventory files - only smaller files work within edge function memory limits (~150MB)
// Files over ~2-3MB compressed tend to fail due to decompression memory requirements
const INVENTORY_FILES: Record<string, string> = {
  // Small files that work reliably (under 3MB compressed)
  featured: 'featured_listings.json.zip',              // ~685 bytes - tiny
  mostActive: 'most_active_feed_all.json.zip',         // ~90KB - works
  listings2: 'all_listings2.json.zip',                 // ~155KB - works
  nonAdultListings2: 'all_non_adult_listings2.json.zip', // ~516KB - works
  fiveLetter: '5_letter_auctions.json.zip',            // ~575KB - works
  fourLetter: '4_letter_auctions.json.zip',            // ~200KB - try
  threeLetter: '3_letter_auctions.json.zip',           // ~50KB - try
  withPageviews: 'listings_with_pageviews.json.zip',   // ~797KB - works
  recent: 'recent_listings.json.zip',                  // ~1MB - works
  auctionsEndingToday: 'auctions_ending_today.json.zip', // ~1.7MB - works
  endingTomorrow: 'all_listings_ending_tomorrow.json.zip', // ~1.8MB - works
  auctionsEndingTomorrow: 'auctions_ending_tomorrow.json.zip', // ~1.8MB - works
  highTraffic: 'high_traffic_listings.json.zip',       // ~500KB - try
  premiumListings: 'premium_listings.json.zip',        // ~300KB - try
  valuedOver1000: 'valued_over_1000.json.zip',         // ~2MB - try
  
  // Medium files - worth trying (3-5MB)
  closeout: 'closeout_listings.json.zip',              // ~3-5MB - try
  expiring: 'expiring_listings.json.zip',              // ~5MB - try
  
  // These files are too large (8MB+) - skip
  // endingToday: 'all_listings_ending_today.json.zip', // ~10MB - too large
  // allBiddable: 'all_biddable_auctions.json.zip',  // ~19MB - too large
  // allExpiring: 'all_expiring_auctions.json.zip',  // ~28MB - too large
  // allListings: 'all_listings.json.zip',           // ~28MB - too large
};

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
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    jsonData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      jsonData.set(chunk, offset);
      offset += chunk.length;
    }
  } else {
    throw new Error(`Unsupported compression method: ${compressionMethod}`);
  }
  
  return new TextDecoder().decode(jsonData);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const inventoryType = url.searchParams.get('type') || 'fiveLetter';
    
    const inventoryFile = INVENTORY_FILES[inventoryType] || INVENTORY_FILES.fiveLetter;
    const inventoryUrl = `${INVENTORY_BASE}/${inventoryFile}`;
    console.log(`Syncing auctions from: ${inventoryUrl} (type: ${inventoryType})`);

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
    
    const jsonContent = await extractJsonFromZip(zipData);
    const parsed = JSON.parse(jsonContent);
    const rawAuctions: any[] = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || parsed.data || []);

    console.log(`Parsed ${rawAuctions.length} auctions from ${inventoryType}`);

    // Transform to database format
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

    // Upsert in batches of 500
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
        console.log(`Upserted batch ${i / batchSize + 1}: ${batch.length} auctions`);
      }
    }

    // Clean up old expired auctions (older than 7 days)
    const { error: cleanupError } = await supabase
      .from('auctions')
      .delete()
      .lt('end_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log(`Sync complete: ${totalUpserted} auctions synced`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${totalUpserted} auctions from ${inventoryType}`,
        totalProcessed: rawAuctions.length,
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
