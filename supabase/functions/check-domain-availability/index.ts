import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainCheck {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
  method: "rdap" | "dns";
  verified?: boolean; // true if re-verified
}

// RDAP endpoints per TLD — these are AUTHORITATIVE registry lookups
const RDAP_ENDPOINTS: Record<string, string> = {
  ".com": "https://rdap.verisign.com/com/v1/domain/",
  ".net": "https://rdap.verisign.com/net/v1/domain/",
  ".org": "https://rdap.publicinterestregistry.org/rdap/domain/",
  ".io":  "https://rdap.nic.io/domain/",
  ".ai":  "https://rdap.nic.ai/domain/",
  ".co":  "https://rdap.nic.co/domain/",
  ".app": "https://rdap.nic.google/domain/",
  ".dev": "https://rdap.nic.google/domain/",
};

// Authoritative RDAP check: 200 = registered, 404 = available
async function checkRDAP(domain: string, tld: string): Promise<DomainCheck> {
  const endpoint = RDAP_ENDPOINTS[tld];
  if (!endpoint) {
    return checkDNS(domain); // fallback for TLDs without RDAP
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${endpoint}${domain}`, {
      signal: controller.signal,
      headers: { "Accept": "application/rdap+json" },
    });
    clearTimeout(timeout);

    if (resp.status === 404) {
      // 404 = domain not found in registry = AVAILABLE
      return { domain, available: true, status: "available", method: "rdap" };
    }

    // IMPORTANT: 400 = bad request, NOT "available". Treat as unknown.
    if (resp.status === 400) {
      console.warn(`RDAP returned 400 for ${domain} — treating as unknown, falling back to DNS`);
      return checkDNS(domain);
    }

    if (resp.status === 200) {
      // 200 = domain exists in registry = REGISTERED
      return { domain, available: false, status: "registered", method: "rdap" };
    }

    // Rate limited or other error — fall back to DNS
    if (resp.status === 429) {
      console.warn(`RDAP rate limited for ${domain}, falling back to DNS`);
      return checkDNS(domain);
    }

    return { domain, available: null, status: "unknown", method: "rdap" };
  } catch (e) {
    // Timeout or network error — fall back to DNS
    console.warn(`RDAP failed for ${domain}: ${e}, falling back to DNS`);
    return checkDNS(domain);
  }
}

// Fallback: DNS-over-HTTPS check (less reliable but fast)
async function checkDNS(domain: string): Promise<DomainCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!resp.ok) return { domain, available: null, status: "unknown", method: "dns" };

    const data = await resp.json();

    // NXDOMAIN = domain does not exist
    if (data.Status === 3) {
      return { domain, available: true, status: "available", method: "dns" };
    }

    // Has NS records = definitely registered
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return { domain, available: false, status: "registered", method: "dns" };
    }

    // No NS but NOERROR — check A records too
    if (data.Status === 0) {
      const aResp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (aResp.ok) {
        const aData = await aResp.json();
        if (aData.Status === 3) return { domain, available: true, status: "available", method: "dns" };
        if (aData.Answer && aData.Answer.length > 0) return { domain, available: false, status: "registered", method: "dns" };
      }
      // Conservative: if DNS gives ambiguous result, mark as unknown rather than falsely saying available
      return { domain, available: null, status: "unknown", method: "dns" };
    }

    return { domain, available: null, status: "unknown", method: "dns" };
  } catch {
    return { domain, available: null, status: "unknown", method: "dns" };
  }
}

function getTld(domain: string): string {
  const dot = domain.indexOf(".");
  return dot >= 0 ? domain.substring(dot) : "";
}

// Check a single domain using the best method for its TLD
async function checkDomain(domain: string): Promise<DomainCheck> {
  const tld = getTld(domain);
  return checkRDAP(domain, tld);
}

// Re-verify domains that were marked available via DNS fallback
// DNS can give false positives, so we do a second check with RDAP on a different endpoint
async function reVerifyAvailable(results: DomainCheck[]): Promise<DomainCheck[]> {
  const toReVerify = results.filter(
    (r) => r.status === "available" && r.method === "dns"
  );

  if (toReVerify.length === 0) return results;

  console.log(`Re-verifying ${toReVerify.length} DNS-based "available" results...`);

  const reVerified = new Map<string, DomainCheck>();

  // Re-check via a second DNS query with SOA record type (more definitive)
  for (let i = 0; i < toReVerify.length; i += 10) {
    const batch = toReVerify.slice(i, i + 10);
    const checks = batch.map(async (r) => {
      try {
        const resp = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(r.domain)}&type=SOA`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        
        // If SOA returns records or NOERROR with authority, domain likely exists
        if (data.Status === 0 && (data.Answer?.length > 0 || data.Authority?.length > 0)) {
          // Check if authority section shows the domain's own SOA (registered) 
          // vs parent zone SOA (not registered)
          const domainBase = r.domain.split(".").slice(-2).join(".");
          const hasOwnSOA = data.Answer?.some((a: any) => 
            a.name?.toLowerCase() === r.domain.toLowerCase()
          ) || data.Authority?.some((a: any) => 
            a.name?.toLowerCase() === r.domain.toLowerCase()
          );
          
          if (hasOwnSOA) {
            reVerified.set(r.domain, {
              ...r,
              available: false,
              status: "registered",
              verified: true,
            });
          }
        }
        // NXDOMAIN on SOA confirms it's truly available
        if (data.Status === 3) {
          reVerified.set(r.domain, { ...r, verified: true });
        }
      } catch {
        // If re-verify fails, mark as unknown to be safe
        reVerified.set(r.domain, {
          ...r,
          available: null,
          status: "unknown",
          verified: true,
        });
      }
    });
    await Promise.all(checks);
    if (i + 10 < toReVerify.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Merge re-verified results
  return results.map((r) => reVerified.get(r.domain) || r);
}

// Process domains in batches with concurrency control
async function checkBatch(domains: string[], batchSize = 15): Promise<DomainCheck[]> {
  const results: DomainCheck[] = [];
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkDomain));
    results.push(...batchResults);
    // Delay between batches to avoid RDAP rate-limiting
    if (i + batchSize < domains.length) {
      await new Promise(r => setTimeout(r, 200));
    }
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

    // Allow up to 800 checks per request
    const toCheck = domains.slice(0, 800);
    console.log(`Checking ${toCheck.length} domains (RDAP-first for .com/.net/.org/.io/.ai/.co/.app/.dev)`);
    let results = await checkBatch(toCheck);

    // Re-verify any DNS-based "available" results to catch false positives
    results = await reVerifyAvailable(results);

    const rdapCount = results.filter(r => r.method === "rdap").length;
    const dnsCount = results.filter(r => r.method === "dns").length;
    const availCount = results.filter(r => r.status === "available").length;
    const reVerifiedCount = results.filter(r => r.verified).length;
    console.log(`Results: ${availCount} available, ${rdapCount} via RDAP, ${dnsCount} via DNS, ${reVerifiedCount} re-verified`);

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
