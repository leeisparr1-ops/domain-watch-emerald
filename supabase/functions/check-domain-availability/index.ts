import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainCheck {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

// Primary: DNS-over-HTTPS check via Google. No DNS records = likely available.
async function checkDNS(domain: string): Promise<DomainCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Check for NS records — every registered domain must have them
    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!resp.ok) {
      return { domain, available: null, status: "unknown" };
    }

    const data = await resp.json();
    
    // Status 3 = NXDOMAIN (domain does not exist) = available
    if (data.Status === 3) {
      return { domain, available: true, status: "available" };
    }
    
    // Status 0 = NOERROR with answers = registered
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return { domain, available: false, status: "registered" };
    }

    // Status 0 but no answers — could be parked/available, do a secondary A record check
    if (data.Status === 0 && (!data.Answer || data.Answer.length === 0)) {
      // Check A records as fallback
      const aResp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (aResp.ok) {
        const aData = await aResp.json();
        if (aData.Status === 3) {
          return { domain, available: true, status: "available" };
        }
        if (aData.Answer && aData.Answer.length > 0) {
          return { domain, available: false, status: "registered" };
        }
      }
      // No A records and no NS records — likely available (some TLDs)
      return { domain, available: true, status: "available" };
    }

    // Status 2 = SERVFAIL, etc.
    return { domain, available: null, status: "unknown" };
  } catch {
    return { domain, available: null, status: "unknown" };
  }
}

// Process domains in batches to avoid overwhelming RDAP servers
async function checkBatch(domains: string[], batchSize = 15): Promise<DomainCheck[]> {
  const results: DomainCheck[] = [];
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkDNS));
    results.push(...batchResults);
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domains } = await req.json() as { domains: string[] };
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      throw new Error("domains array is required");
    }

    // Limit to 100 checks per request
    const toCheck = domains.slice(0, 100);
    const results = await checkBatch(toCheck);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-domain-availability error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
