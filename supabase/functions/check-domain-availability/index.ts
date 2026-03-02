import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainCheck {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
  method: "rdap" | "dns" | "rdap-bootstrap";
  verified?: boolean;
}

// Known RDAP endpoints — authoritative registry lookups
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
  ".gg":  "https://rdap.channelisles.net/rdap/domain/",
  ".sh":  "https://rdap.nic.sh/domain/",
  ".ac":  "https://rdap.nic.ac/domain/",
  ".ly":  "https://rdap.nic.ly/domain/",
};

const RDAP_TLDS = new Set(Object.keys(RDAP_ENDPOINTS));

// Cache for IANA bootstrap lookups (TLD → RDAP URL)
const bootstrapCache = new Map<string, string | null>();

function getTld(domain: string): string {
  const dot = domain.indexOf(".");
  return dot >= 0 ? domain.substring(dot) : "";
}

// ── IANA RDAP Bootstrap — discover RDAP endpoint for any TLD ──────────
async function discoverRDAPEndpoint(tld: string): Promise<string | null> {
  if (bootstrapCache.has(tld)) return bootstrapCache.get(tld) ?? null;

  try {
    const resp = await fetch("https://data.iana.org/rdap/dns.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) { await resp.text(); bootstrapCache.set(tld, null); return null; }
    const data = await resp.json();

    const tldBare = tld.replace(".", "");
    for (const entry of data.services || []) {
      const [tlds, urls] = entry;
      if (tlds.some((t: string) => t.toLowerCase() === tldBare.toLowerCase())) {
        const url = urls[0];
        if (url) {
          const endpoint = url.endsWith("/") ? `${url}domain/` : `${url}/domain/`;
          bootstrapCache.set(tld, endpoint);
          return endpoint;
        }
      }
    }
    bootstrapCache.set(tld, null);
    return null;
  } catch {
    bootstrapCache.set(tld, null);
    return null;
  }
}

// ── RDAP check (authoritative, most reliable) ──────────────────────────
async function checkRDAP(domain: string, endpoint: string): Promise<DomainCheck> {
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
    await resp.text();
    return { domain, available: null, status: "unknown", method: "rdap" };
  } catch {
    return { domain, available: null, status: "unknown", method: "rdap" };
  }
}

// ── Comprehensive DNS check — ALL record types must be empty ───────────
// This is the STRICT version: we check NS, A, AAAA, MX, CNAME, TXT, SOA
// A domain is only "likely available" if ALL return NXDOMAIN/empty
async function checkDNSStrict(domain: string): Promise<DomainCheck> {
  try {
    // Phase 1: Quick check — if ANY record exists, it's definitely registered
    const quickTypes = ["NS", "A", "SOA"];
    for (const type of quickTypes) {
      const resp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();

      // Has answer records = definitely registered
      if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
        if (type === "SOA") {
          const hasOwnSOA = data.Answer.some((a: any) =>
            a.name?.toLowerCase().replace(/\.$/, "") === domain.toLowerCase()
          );
          if (hasOwnSOA) {
            return { domain, available: false, status: "registered", method: "dns" };
          }
          continue;
        }
        return { domain, available: false, status: "registered", method: "dns" };
      }

      // Check Authority section for SOA
      if (data.Status === 0 && data.Authority?.length > 0 && type === "SOA") {
        const hasOwnSOA = data.Authority.some((a: any) =>
          a.name?.toLowerCase().replace(/\.$/, "") === domain.toLowerCase()
        );
        if (hasOwnSOA) {
          return { domain, available: false, status: "registered", method: "dns" };
        }
      }
    }

    // Phase 2: Additional record types — registered domains often have MX/CNAME/TXT
    const extraTypes = ["MX", "CNAME", "AAAA", "TXT"];
    for (const type of extraTypes) {
      try {
        const resp = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (!resp.ok) { await resp.text(); continue; }
        const data = await resp.json();

        if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
          return { domain, available: false, status: "registered", method: "dns" };
        }
      } catch {
        // Timeout on extra check is OK, continue
      }
    }

    // Phase 3: Final NS NXDOMAIN check — the strongest DNS signal for availability
    const nsResp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (nsResp.ok) {
      const nsData = await nsResp.json();
      if (nsData.Status === 3) {
        // NXDOMAIN on all record types — POSSIBLY available
        // DNS alone cannot confirm availability (many registered domains have no DNS)
        // Return as "possibly available" — unverified, UI should show disclaimer
        return { domain, available: null, status: "unknown", method: "dns", verified: false };
      }
    }

    // Inconclusive
    return { domain, available: null, status: "unknown", method: "dns" };
  } catch {
    return { domain, available: null, status: "unknown", method: "dns" };
  }
}

// ── Main check: RDAP-first, bootstrap discovery, strict DNS fallback ──
async function checkDomain(domain: string): Promise<DomainCheck> {
  const tld = getTld(domain);

  // 1. Known RDAP endpoints (fastest, most reliable)
  if (RDAP_TLDS.has(tld)) {
    const rdapResult = await checkRDAP(domain, RDAP_ENDPOINTS[tld]);
    if (rdapResult.status !== "unknown") return rdapResult;
    // RDAP was rate-limited — try strict DNS
    return checkDNSStrict(domain);
  }

  // 2. Try IANA RDAP bootstrap discovery for unknown TLDs
  const bootstrapEndpoint = await discoverRDAPEndpoint(tld);
  if (bootstrapEndpoint) {
    const rdapResult = await checkRDAP(domain, bootstrapEndpoint);
    if (rdapResult.status !== "unknown") {
      return { ...rdapResult, method: "rdap-bootstrap" };
    }
  }

  // 3. Fall back to strict DNS (conservative, multi-record check)
  return checkDNSStrict(domain);
}

// Process domains in batches
async function checkBatch(domains: string[], batchSize = 15): Promise<DomainCheck[]> {
  const results: DomainCheck[] = [];
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkDomain));
    results.push(...batchResults);
    if (i + batchSize < domains.length) {
      await new Promise((r) => setTimeout(r, 200));
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
    console.log(`Checking ${toCheck.length} domains (RDAP-first + bootstrap + strict DNS)`);
    const results = await checkBatch(toCheck);

    const rdapCount = results.filter((r) => r.method === "rdap").length;
    const bootstrapCount = results.filter((r) => r.method === "rdap-bootstrap").length;
    const dnsCount = results.filter((r) => r.method === "dns").length;
    const availCount = results.filter((r) => r.status === "available").length;
    const verifiedCount = results.filter((r) => r.verified).length;
    console.log(`Results: ${availCount} available (${verifiedCount} registry-verified) | RDAP: ${rdapCount}, Bootstrap: ${bootstrapCount}, DNS: ${dnsCount}`);

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
