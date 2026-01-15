import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuctionDomain {
  auctionId: string;
  domain: string;
  auctionEndTime: string;
  price: number;
  numberOfBids: number;
  traffic: number;
  domainAge: number;
  auctionType: string;
  tld: string;
}

// GoDaddy inventory URLs
const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com';
const INVENTORY_FILES = {
  endingToday: 'all_listings_ending_today.json.zip',
  endingTomorrow: 'all_listings_ending_tomorrow.json.zip',
  allBiddable: 'all_biddable_auctions.json.zip',
  allExpiring: 'all_expiring_auctions.json.zip',
  allListings: 'all_listings.json.zip',
  fiveLetter: '5_letter_auctions.json.zip',
};

// Simple ZIP file parser for single-file archives
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const inventoryType = url.searchParams.get('type') || 'fiveLetter'; // Default to smaller file
    const tld = url.searchParams.get('tld') || '';
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '999999999');
    const sortBy = url.searchParams.get('sortBy') || 'endTime';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    const inventoryFile = INVENTORY_FILES[inventoryType as keyof typeof INVENTORY_FILES] || INVENTORY_FILES.fiveLetter;
    const inventoryUrl = `${INVENTORY_BASE}/${inventoryFile}`;

    console.log('Fetching from GoDaddy inventory:', inventoryUrl);

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
    console.log(`Extracted JSON, first 500 chars: ${jsonContent.substring(0, 500)}`);

    const parsed = JSON.parse(jsonContent);
    const rawAuctions: any[] = Array.isArray(parsed) ? parsed : (parsed.auctions || parsed.listings || parsed.data || []);

    console.log(`Parsed ${rawAuctions.length} auctions`);
    if (rawAuctions.length > 0) {
      console.log('Sample auction keys:', Object.keys(rawAuctions[0]).join(', '));
      console.log('Sample auction:', JSON.stringify(rawAuctions[0]).substring(0, 300));
    }

    // Transform with flexible field mapping based on actual GoDaddy format
    // Sample: {"domainName":"PPN57.COM","link":"...","auctionType":"BuyNow","auctionEndTime":"2026-01-14T16:00:00Z","price":"$5","numberOfBids":0,"domainAge":7,"pageviews":0,"valuation":"$1,067","isAdult":false}
    let auctions: AuctionDomain[] = rawAuctions.map((item: any) => {
      // GoDaddy uses camelCase field names
      const domain = item.domainName || item.DomainName || item.domain || item.dn || item.name || '';
      const auctionId = String(item.auctionId || item.AuctionId || item.id || Math.random().toString(36).substr(2, 9));
      const endTime = item.auctionEndTime || item.AuctionEndTime || item.endTime || new Date().toISOString();
      
      // Price comes as "$5" string, need to parse
      let price = 0;
      const priceRaw = item.price || item.Price || item.currentPrice || item.minBid || '0';
      if (typeof priceRaw === 'string') {
        price = parseFloat(priceRaw.replace(/[$,]/g, '')) || 0;
      } else {
        price = parseFloat(priceRaw) || 0;
      }
      
      const bids = parseInt(item.numberOfBids || item.NumberOfBids || item.bids || 0);
      const traffic = parseInt(item.pageviews || item.traffic || item.Traffic || 0);
      const age = parseInt(item.domainAge || item.DomainAge || 0);
      const type = item.auctionType || item.AuctionType || item.type || 'auction';
      
      return {
        auctionId,
        domain,
        auctionEndTime: endTime,
        price,
        numberOfBids: bids,
        traffic,
        domainAge: age,
        auctionType: type,
        tld: extractTld(domain),
      };
    }).filter(a => a.domain); // Filter out entries without domains

    console.log(`After filtering empty domains: ${auctions.length} auctions`);

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      auctions = auctions.filter(a => a.domain.toLowerCase().includes(searchLower));
    }

    // Filter by TLD
    if (tld) {
      const tldLower = tld.toLowerCase().replace('.', '');
      auctions = auctions.filter(a => a.tld.toLowerCase().replace('.', '') === tldLower);
    }

    // Filter by price range
    auctions = auctions.filter(a => a.price >= minPrice && a.price <= maxPrice);

    // Sort
    auctions.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'bids':
          comparison = a.numberOfBids - b.numberOfBids;
          break;
        case 'traffic':
          comparison = a.traffic - b.traffic;
          break;
        case 'endTime':
        default:
          comparison = new Date(a.auctionEndTime).getTime() - new Date(b.auctionEndTime).getTime();
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const totalCount = auctions.length;
    const startIndex = (page - 1) * limit;
    const paginatedAuctions = auctions.slice(startIndex, startIndex + limit);

    console.log(`Returning ${paginatedAuctions.length} auctions (page ${page}, total ${totalCount})`);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedAuctions,
        totalCount,
        page,
        limit,
        source: 'godaddy-inventory',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching auction data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch auction data';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        data: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractTld(domain: string): string {
  const parts = domain.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}
