import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domains } = await req.json();
    if (!Array.isArray(domains) || domains.length === 0) {
      return new Response(JSON.stringify({ error: "domains array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 50 domains per request
    const batch = domains.slice(0, 50);
    const results: Record<string, string[]> = {};

    // Look up NS records via Google DNS-over-HTTPS (free, no key needed)
    await Promise.all(
      batch.map(async (domain: string) => {
        try {
          const resp = await fetch(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!resp.ok) {
            results[domain] = [];
            return;
          }
          const data = await resp.json();
          // NS records from Answer section (type 2)
          const nsRecords = (data.Answer ?? [])
            .filter((r: any) => r.type === 2)
            .map((r: any) => r.data?.replace(/\.$/, "") ?? "")
            .filter(Boolean)
            .sort();

          // If no NS records in Answer, extract primary NS from SOA in Authority
          if (nsRecords.length === 0 && data.Authority) {
            for (const auth of data.Authority) {
              if (auth.type === 6 && auth.data) {
                // SOA data format: "ns1.example.com. hostmaster.example.com. ..."
                const primaryNs = auth.data.split(" ")[0]?.replace(/\.$/, "");
                if (primaryNs) {
                  nsRecords.push(primaryNs);
                }
              }
            }
          }
          results[domain] = nsRecords;
        } catch {
          results[domain] = [];
        }
      })
    );

    // Save to DB using service role
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const updates = Object.entries(results).filter(([, ns]) => ns.length > 0);
    for (const [domain, ns] of updates) {
      await adminClient
        .from("portfolio_domains")
        .update({ nameservers: ns })
        .eq("user_id", user.id)
        .eq("domain_name", domain);
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("lookup-nameservers error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
