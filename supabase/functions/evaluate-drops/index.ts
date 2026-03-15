import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: get user from JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { csvText, scanId } = await req.json();
    if (!csvText || !scanId) throw new Error("Missing csvText or scanId");

    // Parse CSV — extract domain names (first column or column named "domain"/"Domain Name")
    const lines = csvText.trim().split("\n");
    const header = lines[0].toLowerCase();
    const cols = header.split(",").map((c: string) => c.trim().replace(/"/g, ""));
    let domainCol = cols.findIndex((c: string) =>
      c === "domain" || c === "domain name" || c === "domainname" || c === "name"
    );
    if (domainCol === -1) domainCol = 0;

    const allDomains: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((c: string) => c.trim().replace(/"/g, ""));
      const domain = row[domainCol]?.toLowerCase().trim();
      if (domain && domain.endsWith(".com") && domain.length > 4) {
        allDomains.push(domain);
      }
    }

    // Deduplicate
    const domains = [...new Set(allDomains)];

    // Update scan with counts
    await adminClient.from("drop_scans").update({
      total_domains: lines.length - 1,
      filtered_domains: domains.length,
      status: "evaluating",
    }).eq("id", scanId);

    // Batch evaluate
    let evaluated = 0;
    for (let i = 0; i < domains.length; i += BATCH_SIZE) {
      const batch = domains.slice(i, i + BATCH_SIZE);

      const prompt = `You are a domain investment expert. Evaluate each domain name for its investment potential as an expiring/dropping domain.

For each domain, provide:
- score: 1-100 investment quality score
- summary: one-sentence explanation (max 15 words)
- category: one of [brandable, keyword, short, geo, niche, generic, premium, weak]
- estimated_value: realistic USD resale value estimate
- brandability: 1-100 how brandable/memorable
- keyword_strength: 1-100 keyword commercial value

Focus on: length, pronounceability, commercial keyword value, brandability, resale potential.

Domains to evaluate:
${batch.join("\n")}

Return a JSON array of objects with keys: domain, score, summary, category, estimated_value, brandability, keyword_strength`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a domain name investment evaluator. Return only valid JSON arrays. No markdown." },
              { role: "user", content: prompt },
            ],
            temperature: 0,
          }),
        });

        if (!aiResp.ok) {
          const status = aiResp.status;
          if (status === 429 || status === 402) {
            console.warn(`Rate limited (${status}), waiting 10s...`);
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
          console.error("AI error:", status, await aiResp.text());
          continue;
        }

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from response (handle markdown code blocks)
        let parsed: any[];
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          console.error("Failed to parse AI response for batch", i, content.slice(0, 200));
          continue;
        }

        // Insert results
        const rows = parsed.map((r: any) => ({
          scan_id: scanId,
          domain_name: r.domain || r.domain_name,
          ai_score: Math.min(100, Math.max(0, Number(r.score) || 0)),
          ai_summary: r.summary || "",
          category: r.category || "generic",
          estimated_value: Number(r.estimated_value) || 0,
          brandability: Math.min(100, Math.max(0, Number(r.brandability) || 0)),
          keyword_strength: Math.min(100, Math.max(0, Number(r.keyword_strength) || 0)),
        }));

        if (rows.length > 0) {
          await adminClient.from("drop_scan_results").insert(rows);
        }

        evaluated += batch.length;
        await adminClient.from("drop_scans").update({ evaluated_domains: evaluated }).eq("id", scanId);
      } catch (batchErr) {
        console.error("Batch error:", batchErr);
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < domains.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Mark complete
    await adminClient.from("drop_scans").update({ status: "complete", evaluated_domains: evaluated }).eq("id", scanId);

    return new Response(JSON.stringify({ success: true, evaluated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-drops error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
