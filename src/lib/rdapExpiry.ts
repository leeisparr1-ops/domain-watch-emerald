/**
 * RDAP Expiry Date Lookup
 * Fetches the exact registry expiration date for a domain via public RDAP.
 * Uses the IANA RDAP bootstrap to find the correct RDAP server for each TLD.
 */

// Cache RDAP bootstrap data (TLD -> RDAP server URL)
let bootstrapCache: Record<string, string> | null = null;

async function getBootstrap(): Promise<Record<string, string>> {
  if (bootstrapCache) return bootstrapCache;
  try {
    const res = await fetch("https://data.iana.org/rdap/dns.json");
    if (!res.ok) throw new Error("Bootstrap fetch failed");
    const data = await res.json();
    const map: Record<string, string> = {};
    for (const [tlds, urls] of data.services ?? []) {
      const serverUrl = (urls as string[])[0];
      for (const tld of tlds as string[]) {
        map[tld.toLowerCase()] = serverUrl.replace(/\/+$/, "");
      }
    }
    bootstrapCache = map;
    return map;
  } catch {
    // Fallback to common RDAP servers
    return {
      com: "https://rdap.verisign.com/com/v1",
      net: "https://rdap.verisign.com/net/v1",
      org: "https://rdap.org.rdap.org",
      io: "https://rdap.nic.io",
      co: "https://rdap.nic.co",
      ai: "https://rdap.nic.ai",
      dev: "https://rdap.nic.google",
      app: "https://rdap.nic.google",
      xyz: "https://rdap.nic.xyz",
    };
  }
}

export interface RdapExpiryResult {
  expirationDate: string | null; // ISO date string (yyyy-MM-dd)
  registrationDate: string | null;
  source: "rdap";
  error?: string;
}

/**
 * Fetch the exact expiration date for a domain from RDAP.
 * Returns null expirationDate if RDAP lookup fails or expiry not found.
 */
export async function fetchRdapExpiry(domainName: string): Promise<RdapExpiryResult> {
  try {
    const tld = domainName.split(".").pop()?.toLowerCase();
    if (!tld) return { expirationDate: null, registrationDate: null, source: "rdap", error: "Invalid domain" };

    const bootstrap = await getBootstrap();
    const rdapServer = bootstrap[tld];

    if (!rdapServer) {
      return { expirationDate: null, registrationDate: null, source: "rdap", error: `No RDAP server for .${tld}` };
    }

    const url = `${rdapServer}/domain/${domainName}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json,application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { expirationDate: null, registrationDate: null, source: "rdap", error: `RDAP ${res.status}` };
    }

    const data = await res.json();
    
    let expirationDate: string | null = null;
    let registrationDate: string | null = null;

    // Extract from events array
    if (Array.isArray(data.events)) {
      for (const event of data.events) {
        const action = event.eventAction?.toLowerCase();
        const dateStr = event.eventDate;
        if (!dateStr) continue;

        if (action === "expiration") {
          expirationDate = dateStr.substring(0, 10); // yyyy-MM-dd
        } else if (action === "registration") {
          registrationDate = dateStr.substring(0, 10);
        }
      }
    }

    return { expirationDate, registrationDate, source: "rdap" };
  } catch (err: any) {
    return {
      expirationDate: null,
      registrationDate: null,
      source: "rdap",
      error: err?.name === "AbortError" ? "Timeout" : (err?.message ?? "Unknown error"),
    };
  }
}
