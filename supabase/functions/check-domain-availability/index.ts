import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainCheck {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
  method: "dns" | "rdap" | "soa";
  verified?: boolean;
}

// RDAP endpoints per TLD — authoritative registry lookups (used as fallback)
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

// ── Layer 1: DNS-over-HTTPS (free, no rate limits) ──────────────────────
// Uses Google Public DNS to check NS/A records.
// NXDOMAIN = likely available, has records = registered, ambiguous = unknown → fallback
async function checkDNS(domain: string): Promise<DomainCheck> {
  try {
    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) {
      await resp.text();
      return { domain, available: null, status: "unknown", method: "dns" };
    }

    const data = await resp.json();

    // NXDOMAIN = domain does not exist → likely available
    if (data.Status === 3) {
      return { domain, available: true, status: "available", method: "dns" };
    }

    // Has NS answer records = definitely registered
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return { domain, available: false, status: "registered", method: "dns" };
    }

    // NOERROR but no NS answers — check A records as second signal
    if (data.Status === 0) {
      try {
        const aResp = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (aResp.ok) {
          const aData = await aResp.json();
          if (aData.Status === 3) return { domain, available: true, status: "available", method: "dns" };
          if (aData.Answer && aData.Answer.length > 0) return { domain, available: false, status: "registered", method: "dns" };
        } else {
          await aResp.text();
        }
      } catch { /* swallow */ }

      // Ambiguous — return unknown so it falls through to RDAP
      return { domain, available: null, status: "unknown", method: "dns" };
    }

    return { domain, available: null, status: "unknown", method: "dns" };
  } catch {
    return { domain, available: null, status: "unknown", method: "dns" };
  }
}

// ── Layer 2: RDAP (authoritative, 60/min rate limit) ────────────────────
// Only called for domains where DNS returned "unknown"
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
      return { domain, available: true, status: "available", method: "rdap" };
    }
    if (resp.status === 200) {
      await resp.text(); // consume body
      return { domain, available: false, status: "registered", method: "rdap" };
    }
    if (resp.status === 400 || resp.status === 429) {
      await resp.text();
      return { domain, available: null, status: "unknown", method: "rdap" };
    }
    await resp.text();
    return { domain, available: null, status: "unknown", method: "rdap" };
  } catch {
    return { domain, available: null, status: "unknown", method: "rdap" };
  }
}

// ── Layer 3: SOA re-verification (free, catches DNS false positives) ────
// Only called on DNS-based "available" results to confirm
async function reVerifyWithSOA(results: DomainCheck[]): Promise<DomainCheck[]> {
  const toVerify = results.filter(
    (r) => r.status === "available" && r.method === "dns"
  );

  if (toVerify.length === 0) return results;
  console.log(`SOA re-verifying ${toVerify.length} DNS-based "available" results...`);

  const reVerified = new Map<string, DomainCheck>();

  for (let i = 0; i < toVerify.length; i += 20) {
    const batch = toVerify.slice(i, i + 20);
    const checks = batch.map(async (r) => {
      try {
        const resp = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(r.domain)}&type=SOA`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!resp.ok) { await resp.text(); return; }
        const data = await resp.json();

        if (data.Status === 3) {
          // NXDOMAIN on SOA confirms truly available
          reVerified.set(r.domain, { ...r, verified: true, method: "soa" });
          return;
        }

        if (data.Status === 0 && (data.Answer?.length > 0 || data.Authority?.length > 0)) {
          const hasOwnSOA = data.Answer?.some((a: any) =>
            a.name?.toLowerCase() === r.domain.toLowerCase()
          ) || data.Authority?.some((a: any) =>
            a.name?.toLowerCase() === r.domain.toLowerCase()
          );

          if (hasOwnSOA) {
            reVerified.set(r.domain, {
              ...r, available: false, status: "registered", verified: true, method: "soa",
            });
          } else {
            // Parent zone SOA only — still available
            reVerified.set(r.domain, { ...r, verified: true, method: "soa" });
          }
        }
      } catch {
        reVerified.set(r.domain, { ...r, available: null, status: "unknown", verified: true });
      }
    });
    await Promise.all(checks);
    if (i + 20 < toVerify.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return results.map((r) => reVerified.get(r.domain) || r);
}

function getTld(domain: string): string {
  const dot = domain.indexOf(".");
  return dot >= 0 ? domain.substring(dot) : "";
}

// ── Main check pipeline: DNS → RDAP fallback ────────────────────────────
async function checkDomain(domain: string): Promise<DomainCheck> {
  // Layer 1: DNS (free, unlimited)
  const dnsResult = await checkDNS(domain);

  // If DNS gave a definitive answer, use it (will be SOA-verified later if "available")
  if (dnsResult.status !== "unknown") {
    return dnsResult;
  }

  // Layer 2: RDAP fallback for ambiguous DNS results
  const tld = getTld(domain);
  return checkRDAP(domain, tld);
}

// Process domains in batches — larger batches since DNS is free
async function checkBatch(domains: string[], batchSize = 30): Promise<DomainCheck[]> {
  const results: DomainCheck[] = [];
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkDomain));
    results.push(...batchResults);
    // Tiny delay between batches — DNS is free so we can go fast
    if (i + batchSize < domains.length) {
      await new Promise((r) => setTimeout(r, 50));
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

    // Allow up to 1000 checks per request (increased from 800 since DNS is free)
    const toCheck = domains.slice(0, 1000);
    console.log(`Checking ${toCheck.length} domains (DNS-first → RDAP fallback)`);
    let results = await checkBatch(toCheck);

    // Layer 3: SOA re-verify any DNS-based "available" to catch false positives
    results = await reVerifyWithSOA(results);

    const dnsCount = results.filter((r) => r.method === "dns").length;
    const rdapCount = results.filter((r) => r.method === "rdap").length;
    const soaCount = results.filter((r) => r.method === "soa").length;
    const availCount = results.filter((r) => r.status === "available").length;
    console.log(`Results: ${availCount} available | DNS: ${dnsCount}, RDAP: ${rdapCount}, SOA-verified: ${soaCount}`);

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
