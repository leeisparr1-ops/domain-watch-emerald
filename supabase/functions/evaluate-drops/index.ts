import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_BATCH_SIZE = 25;
const DOMAINS_PER_INVOCATION = 500; // Process 500 domains per function call, then self-chain

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { scanId, csvText } = body;
    if (!scanId) throw new Error("Missing scanId");

    // If csvText is provided, this is the initial call — store CSV and parse domains
    if (csvText) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing authorization");

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) throw new Error("Unauthorized");

      // Parse CSV to extract .com domains
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
        if (!domain || !domain.endsWith(".com") || domain.length <= 4) continue;

        const sld = domain.replace(/\.com$/, ""); // second-level domain

        // Smart pre-filter: skip junk domains to massively reduce AI calls
        const hasHyphen = sld.includes("-");
        const hasNumber = /\d/.test(sld);
        const tooLong = sld.length > 12;

        // Allow through if it passes all filters, OR contains high-value keywords
        const highValuePattern = /intel|smart|tech|data|cloud|ai|app|web|net|pay|fin|health|med|crypto|dev|hub|lab|bot|gen|code|logic|mind|core|sync|flow|link|base|stack|bit|zen|nova|vox|plex/;
        const hasHighValueKeyword = highValuePattern.test(sld);

        if ((hasHyphen || hasNumber || tooLong) && !hasHighValueKeyword) continue;

        allDomains.push(domain);
      }
      const domains = [...new Set(allDomains)];

      // Store CSV domain list (just the filtered domains, not raw CSV) and update scan
      await adminClient.from("drop_scans").update({
        total_domains: lines.length - 1,
        filtered_domains: domains.length,
        status: "evaluating",
        csv_data: domains.join("\n"),
        resume_from: 0,
      }).eq("id", scanId);

      // Now self-invoke to start processing (no auth needed for chained calls)
      const selfUrl = `${supabaseUrl}/functions/v1/evaluate-drops`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ scanId }),
      }).catch(err => console.error("Self-chain invoke error:", err));

      return new Response(JSON.stringify({ success: true, queued: true, filtered: domains.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Chained invocation: no csvText, just scanId ---
    // Load scan to get domain list and resume point
    const { data: scan, error: scanErr } = await adminClient
      .from("drop_scans")
      .select("csv_data, resume_from, filtered_domains, status")
      .eq("id", scanId)
      .single();

    if (scanErr || !scan) throw new Error("Scan not found");
    if (scan.status === "complete" || scan.status === "error") {
      return new Response(JSON.stringify({ success: true, already: scan.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allDomains = (scan.csv_data || "").split("\n").filter(Boolean);
    const startIdx = scan.resume_from || 0;
    const endIdx = Math.min(startIdx + DOMAINS_PER_INVOCATION, allDomains.length);
    const chunk = allDomains.slice(startIdx, endIdx);

    if (chunk.length === 0) {
      // Nothing left to process
      await adminClient.from("drop_scans").update({
        status: "complete",
        csv_data: null, // Clean up stored data
      }).eq("id", scanId);

      return new Response(JSON.stringify({ success: true, status: "complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process this chunk in AI batches
    let evaluated = startIdx;
    for (let i = 0; i < chunk.length; i += AI_BATCH_SIZE) {
      const batch = chunk.slice(i, i + AI_BATCH_SIZE);

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
            console.warn(`Rate limited (${status}), stopping chunk. Will resume from ${evaluated}.`);
            break;
          }
          console.error("AI error:", status, await aiResp.text());
          evaluated += batch.length;
          continue;
        }

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        let parsed: any[];
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          console.error("Failed to parse AI response for batch", i, content.slice(0, 200));
          evaluated += batch.length;
          continue;
        }

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

        // Update progress every batch
        await adminClient.from("drop_scans").update({
          evaluated_domains: evaluated,
          resume_from: evaluated,
        }).eq("id", scanId);
      } catch (batchErr) {
        console.error("Batch error:", batchErr);
        evaluated += batch.length;
      }

      // Small delay between AI batches
      if (i + AI_BATCH_SIZE < chunk.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Update resume point
    await adminClient.from("drop_scans").update({
      evaluated_domains: evaluated,
      resume_from: evaluated,
    }).eq("id", scanId);

    // If more domains remain, self-chain for next chunk
    if (evaluated < allDomains.length) {
      const selfUrl = `${supabaseUrl}/functions/v1/evaluate-drops`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ scanId }),
      }).catch(err => console.error("Self-chain error:", err));
    } else {
      // All done
      await adminClient.from("drop_scans").update({
        status: "complete",
        csv_data: null,
      }).eq("id", scanId);
    }

    return new Response(JSON.stringify({ success: true, evaluated, total: allDomains.length }), {
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
