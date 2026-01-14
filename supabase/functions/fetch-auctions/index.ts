import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuctionDomain {
  auctionId: number;
  domain: string;
  auctionEndTime: string;
  price: number;
  numberOfBids: number;
  traffic: number;
  domainAge: number;
  auctionType: string;
  tld: string;
}

interface GoDaddyAuctionResponse {
  auctions: any[];
  totalCount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const auctionType = url.searchParams.get('type') || 'all'; // all, expiring, closeout, offer
    const tld = url.searchParams.get('tld') || '';
    const minPrice = url.searchParams.get('minPrice') || '';
    const maxPrice = url.searchParams.get('maxPrice') || '';
    const sortBy = url.searchParams.get('sortBy') || 'endTime'; // endTime, price, bids, traffic
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    // Build GoDaddy API URL
    const gdApiUrl = new URL('https://auctions.godaddy.com/trpSearchResults.aspx');
    
    // GoDaddy uses specific query parameters
    const params: Record<string, string> = {
      '_Type': 'json',
      'page': page.toString(),
      'rows': limit.toString(),
      'skey': searchTerm,
    };

    // Add filters
    if (auctionType !== 'all') {
      switch (auctionType) {
        case 'expiring':
          params['at'] = '2'; // Expiring auctions
          break;
        case 'closeout':
          params['at'] = '5'; // Closeout
          break;
        case 'offer':
          params['at'] = '4'; // Buy now/Offer
          break;
      }
    }

    if (tld) {
      params['ext'] = tld.replace('.', '');
    }

    if (minPrice) {
      params['minp'] = minPrice;
    }

    if (maxPrice) {
      params['maxp'] = maxPrice;
    }

    // Sort mapping
    const sortMapping: Record<string, string> = {
      'endTime': 'auctionEndTime',
      'price': 'price',
      'bids': 'bids',
      'traffic': 'traffic',
    };

    params['sort'] = sortMapping[sortBy] || 'auctionEndTime';
    params['dir'] = sortOrder === 'desc' ? 'desc' : 'asc';

    // Construct the full URL with params
    Object.entries(params).forEach(([key, value]) => {
      gdApiUrl.searchParams.append(key, value);
    });

    console.log('Fetching from GoDaddy:', gdApiUrl.toString());

    // Fetch from GoDaddy's auction inventory
    const response = await fetch(gdApiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DomainMonitor/1.0',
      },
    });

    if (!response.ok) {
      // If the main endpoint fails, try the alternative API
      console.log('Primary endpoint failed, trying alternative...');
      
      const altUrl = `https://auctions.godaddy.com/trpItemListingAction.aspx?miession=public&t=2&_Type=json&page=${page}&rows=${limit}&skey=${encodeURIComponent(searchTerm)}`;
      
      const altResponse = await fetch(altUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DomainMonitor/1.0',
        },
      });

      if (!altResponse.ok) {
        // Return mock data if both endpoints fail (for development)
        console.log('Both endpoints failed, returning mock data');
        return new Response(
          JSON.stringify({
            success: true,
            data: generateMockAuctions(searchTerm, limit),
            totalCount: 100,
            page,
            limit,
            source: 'mock',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const altData = await altResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          data: transformAuctionData(altData),
          totalCount: altData.totalRecords || 0,
          page,
          limit,
          source: 'godaddy',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: transformAuctionData(data),
        totalCount: data.totalRecords || data.length || 0,
        page,
        limit,
        source: 'godaddy',
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

function transformAuctionData(rawData: any): AuctionDomain[] {
  const auctions = rawData.rows || rawData.auctions || rawData || [];
  
  return auctions.map((item: any) => ({
    auctionId: item.auctionId || item.id || Math.random().toString(36).substr(2, 9),
    domain: item.domain || item.dn || item.name || '',
    auctionEndTime: item.auctionEndTime || item.endTime || item.te || new Date().toISOString(),
    price: parseFloat(item.price || item.auctionPrice || item.cp || item.currentPrice || 0),
    numberOfBids: parseInt(item.bids || item.numberOfBids || item.nb || 0),
    traffic: parseInt(item.traffic || item.monthlyTraffic || item.est || 0),
    domainAge: parseInt(item.domainAge || item.age || item.da || 0),
    auctionType: item.auctionType || item.type || item.at || 'auction',
    tld: extractTld(item.domain || item.dn || item.name || ''),
  }));
}

function extractTld(domain: string): string {
  const parts = domain.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

function generateMockAuctions(searchTerm: string, count: number): AuctionDomain[] {
  const tlds = ['.com', '.net', '.org', '.io', '.co', '.dev', '.app'];
  const types = ['expiring', 'closeout', 'offer', 'auction'];
  const prefixes = ['domain', 'web', 'tech', 'cloud', 'crypto', 'digital', 'smart', 'pro'];
  const suffixes = ['hub', 'zone', 'base', 'core', 'labs', 'works', 'group', 'inc'];
  
  const auctions: AuctionDomain[] = [];
  
  for (let i = 0; i < count; i++) {
    const prefix = searchTerm || prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const tld = tlds[Math.floor(Math.random() * tlds.length)];
    const domain = `${prefix}${suffix}${tld}`.toLowerCase();
    
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + Math.floor(Math.random() * 168)); // Up to 7 days
    
    auctions.push({
      auctionId: 100000000 + i,
      domain,
      auctionEndTime: endDate.toISOString(),
      price: Math.floor(Math.random() * 5000) + 10,
      numberOfBids: Math.floor(Math.random() * 50),
      traffic: Math.floor(Math.random() * 10000),
      domainAge: Math.floor(Math.random() * 20) + 1,
      auctionType: types[Math.floor(Math.random() * types.length)],
      tld,
    });
  }
  
  return auctions;
}
