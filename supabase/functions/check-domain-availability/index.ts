import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainCheck {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
  method: "rdap" | "dns" | "soa";
  verified?: boolean;
}

// RDAP endpoints — authoritative registry lookups (most reliable source of truth)
const RDAP_ENDPOINTS: Record<string, string> = {
  ".com": "https://rdap.verisign.com/com/v1/domain/",
  ".net": "https://rdap.verisign.com/net/v1/domain/",
  ".org": "https://rdap.publicinterestregistry.org/rdap/domain/",
  ".io":  "https://rdap.nic.io/domain/",
  ".ai":  "https://rdap.nic.ai/domain/",
  ".co":  "https://rdap.nic.co/domain/",
  ".app": "https://rdap.nic.google/domain/",
  ".dev": "https://rdap.nic.google/domain/",
  ".me":  "https://rdap.nic.me/domain/",
  ".cc":  "https://rdap.verisign.com/cc/v1/domain/",
  ".tv":  "https://rdap.verisign.com/tv/v1/domain/",
  ".xyz": "https://rdap.nic.xyz/domain/",
  ".info": "https://rdap.afilias.net/rdap/info/domain/",
  ".biz": "https://rdap.nic.biz/domain/",
  ".us":  "https://rdap.nic.us/domain/",
  ".mobi": "https://rdap.nic.mobi/domain/",
  ".pro":  "https://rdap.nic.pro/domain/",
  ".name": "https://rdap.verisign.com/name/v1/domain/",
};

// TLDs that have reliable RDAP — use RDAP-first for these
const RDAP_TLDS = new Set(Object.keys(RDAP_ENDPOINTS));

function getTld(domain: string): string {
  const dot = domain.indexOf(".");
  return dot >= 0 ? domain.substring(dot) : "";
}

// ── RDAP check (authoritative, most reliable) ──────────────────────────
// For supported TLDs, this is the PRIMARY check. 404 = available, 200 = registered.
async function checkRDAP(domain: string, tld: string): Promise<DomainCheck> {
  const endpoint = RDAP_ENDPOINTS[tld];
  if (!endpoint) {
    return { domain, available: null, status: "unknown", method: "rdap" };
  }

  try {
    const resp = await fetch(`${endpoint}${domain}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/rdap+json" },
    });

    if (resp.status === 404) {
      return { domain, available: true, status: "available", method: "rdap", verified: true };
    }
    if (resp.status === 200) {
      await resp.text();
      return { domain, available: false, status: "registered", method: "rdap", verified: true };
    }
    // Rate limited or error — return unknown
    await resp.text();
    return { domain, available: null, status: "unknown", method: "rdap" };
  } catch {
    return { domain, available: null, status: "unknown", method: "rdap" };
  }
}

// ── DNS check (fallback for TLDs without RDAP) ─────────────────────────
// NOTE: DNS NXDOMAIN does NOT reliably mean "available" — many registered
// domains have no DNS records. This is only used for TLDs without RDAP.
async function checkDNS(domain: string): Promise<DomainCheck> {
  try {
    // Check multiple record types to reduce false positives
    const types = ["NS", "A", "SOA"];
    for (const type of types) {
      const resp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();

      // Has answer records = definitely registered
      if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
        // For SOA, check if it's the domain's own SOA (not parent zone)
        if (type === "SOA") {
          const hasOwnSOA = data.Answer.some((a: any) =>
            a.name?.toLowerCase() === domain.toLowerCase()
          );
          if (hasOwnSOA) {
            return { domain, available: false, status: "registered", method: "dns" };
          }
          // Parent zone SOA — doesn't tell us definitively
          continue;
        }
        return { domain, available: false, status: "registered", method: "dns" };
      }

      // Check Authority section for SOA
      if (data.Status === 0 && data.Authority?.length > 0 && type === "SOA") {
        const hasOwnSOA = data.Authority.some((a: any) =>
          a.name?.toLowerCase() === domain.toLowerCase()
        );
        if (hasOwnSOA) {
          return { domain, available: false, status: "registered", method: "dns" };
        }
      }

      // NXDOMAIN on NS query = likely available (but not 100% certain without RDAP)
      if (data.Status === 3 && type === "NS") {
        // Mark as available but NOT verified — user should confirm with registrar
        return { domain, available: true, status: "available", method: "dns", verified: false };
      }
    }

    // If all checks were inconclusive
    return { domain, available: null, status: "unknown", method: "dns" };
  } catch {
    return { domain, available: null, status: "unknown", method: "dns" };
  }
}

// ── Main check: RDAP-first for supported TLDs, DNS fallback for others ──
async function checkDomain(domain: string): Promise<DomainCheck> {
  const tld = getTld(domain);

  // For TLDs with RDAP endpoints, use RDAP as PRIMARY (authoritative)
  if (RDAP_TLDS.has(tld)) {
    const rdapResult = await checkRDAP(domain, tld);
    // If RDAP gave a definitive answer, use it
    if (rdapResult.status !== "unknown") {
      return rdapResult;
    }
    // RDAP was rate-limited/errored — fall back to DNS
    return checkDNS(domain);
  }

  // For TLDs without RDAP, use DNS (less reliable but best we can do)
  return checkDNS(domain);
}

// Process domains in batches — throttle RDAP calls to respect rate limits
async function checkBatch(domains: string[], batchSize = 20): Promise<DomainCheck[]> {
  const results: DomainCheck[] = [];
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkDomain));
    results.push(...batchResults);
    // Small delay between batches to respect RDAP rate limits
    if (i + batchSize < domains.length) {
      await new Promise((r) => setTimeout(r, 150));
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

    const toCheck = domains.slice(0, 1000);
    console.log(`Checking ${toCheck.length} domains (RDAP-first for supported TLDs)`);
    const results = await checkBatch(toCheck);

    const rdapCount = results.filter((r) => r.method === "rdap").length;
    const dnsCount = results.filter((r) => r.method === "dns").length;
    const availCount = results.filter((r) => r.status === "available").length;
    const verifiedCount = results.filter((r) => r.verified).length;
    console.log(`Results: ${availCount} available (${verifiedCount} registry-verified) | RDAP: ${rdapCount}, DNS: ${dnsCount}`);

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
