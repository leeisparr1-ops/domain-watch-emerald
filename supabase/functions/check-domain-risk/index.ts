import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DomainRiskResult {
  checked_at: string;
  surbl: boolean;
  risk_level: "none" | "low" | "medium" | "high";
  details: string[];
}

// Perform SURBL DNS-based lookup
// SURBL uses DNS queries - if the domain resolves, it's listed
async function checkSURBL(domain: string): Promise<{ listed: boolean; lists: string[] }> {
  // Extract the base domain (remove subdomains for more accurate check)
  const parts = domain.split(".");
  let baseDomain = domain;
  
  // For domains like "sub.example.com", check "example.com"
  if (parts.length > 2) {
    baseDomain = parts.slice(-2).join(".");
  }
  
  // SURBL multi lookup - checks multiple lists at once
  const surblDomain = `${baseDomain}.multi.surbl.org`;
  
  try {
    // Use Deno's DNS resolver
    const result = await Deno.resolveDns(surblDomain, "A");
    
    if (result && result.length > 0) {
      // Decode the response to identify which lists the domain is on
      const lists: string[] = [];
      const ip = result[0];
      const lastOctet = parseInt(ip.split(".")[3], 10);
      
      // SURBL response codes (bit flags in last octet)
      if (lastOctet & 1) lists.push("SC - SpamCop");
      if (lastOctet & 2) lists.push("WS - sa-blacklist");
      if (lastOctet & 4) lists.push("PH - Phishing");
      if (lastOctet & 8) lists.push("SH - Spamhaus");
      if (lastOctet & 16) lists.push("XS - SURBL Multi");
      if (lastOctet & 32) lists.push("JP - jwSpamSpy");
      if (lastOctet & 64) lists.push("AB - AbuseButler");
      if (lastOctet & 128) lists.push("CR - Cracked");
      
      if (lists.length === 0) {
        lists.push("Unknown SURBL list");
      }
      
      return { listed: true, lists };
    }
    
    return { listed: false, lists: [] };
  } catch (error) {
    // NXDOMAIN or other DNS errors mean the domain is NOT listed
    if (error instanceof Deno.errors.NotFound) {
      return { listed: false, lists: [] };
    }
    
    // Log other errors but don't fail the check
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`SURBL check error for ${domain}:`, message);
    return { listed: false, lists: [] };
  }
}

// Check against Spamhaus DBL (Domain Block List)
async function checkSpamhausDbl(domain: string): Promise<{ listed: boolean; category: string | null }> {
  const parts = domain.split(".");
  let baseDomain = domain;
  
  if (parts.length > 2) {
    baseDomain = parts.slice(-2).join(".");
  }
  
  const dblDomain = `${baseDomain}.dbl.spamhaus.org`;
  
  try {
    const result = await Deno.resolveDns(dblDomain, "A");
    
    if (result && result.length > 0) {
      const ip = result[0];
      
      // Decode Spamhaus DBL response codes
      const categoryMap: Record<string, string> = {
        "127.0.1.2": "Spam domain",
        "127.0.1.4": "Phishing domain",
        "127.0.1.5": "Malware domain",
        "127.0.1.6": "Botnet C&C domain",
        "127.0.1.102": "Abused legit spam",
        "127.0.1.103": "Abused redirector",
        "127.0.1.104": "Abused legit phish",
        "127.0.1.105": "Abused legit malware",
        "127.0.1.106": "Abused legit botnet C&C",
      };
      
      return { 
        listed: true, 
        category: categoryMap[ip] || "Listed on Spamhaus DBL" 
      };
    }
    
    return { listed: false, category: null };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return { listed: false, category: null };
    }
    
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`Spamhaus DBL check error for ${domain}:`, message);
    return { listed: false, category: null };
  }
}

function calculateRiskLevel(surbl: { listed: boolean; lists: string[] }, spamhaus: { listed: boolean; category: string | null }): "none" | "low" | "medium" | "high" {
  // High risk: Phishing, Malware, or Botnet
  const highRiskKeywords = ["phish", "malware", "botnet", "c&c"];
  
  if (spamhaus.listed && spamhaus.category) {
    if (highRiskKeywords.some(k => spamhaus.category!.toLowerCase().includes(k))) {
      return "high";
    }
  }
  
  if (surbl.listed) {
    if (surbl.lists.some(l => l.includes("PH") || l.includes("Phishing"))) {
      return "high";
    }
  }
  
  // Medium risk: Listed on spam lists
  if (spamhaus.listed || surbl.listed) {
    return "medium";
  }
  
  return "none";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain_name } = await req.json();
    
    if (!domain_name || typeof domain_name !== "string") {
      return new Response(
        JSON.stringify({ error: "domain_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean the domain name
    const cleanDomain = domain_name.toLowerCase().trim();
    
    console.log(`Checking risk for domain: ${cleanDomain}`);

    // Run checks in parallel
    const [surblResult, spamhausResult] = await Promise.all([
      checkSURBL(cleanDomain),
      checkSpamhausDbl(cleanDomain),
    ]);

    const riskLevel = calculateRiskLevel(surblResult, spamhausResult);
    
    const details: string[] = [];
    if (surblResult.listed) {
      details.push(...surblResult.lists);
    }
    if (spamhausResult.listed && spamhausResult.category) {
      details.push(`Spamhaus: ${spamhausResult.category}`);
    }

    const riskResult: DomainRiskResult = {
      checked_at: new Date().toISOString(),
      surbl: surblResult.listed,
      risk_level: riskLevel,
      details,
    };

    // Cache the result in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: updateError } = await supabase
      .from("auctions")
      .update({ domain_risk: riskResult })
      .eq("domain_name", cleanDomain);

    if (updateError) {
      console.error("Error caching risk result:", updateError.message);
      // Don't fail the request, just log it
    }

    console.log(`Risk check complete for ${cleanDomain}: ${riskLevel}`);

    return new Response(
      JSON.stringify(riskResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking domain risk:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
