import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HandleResult {
  platform: string;
  handle: string;
  status: "taken" | "available" | "unknown";
}

async function checkHandle(platform: string, handle: string): Promise<HandleResult> {
  const urls: Record<string, string> = {
    twitter: `https://x.com/${handle}`,
    instagram: `https://www.instagram.com/${handle}/`,
    github: `https://github.com/${handle}`,
    tiktok: `https://www.tiktok.com/@${handle}`,
  };

  const url = urls[platform];
  if (!url) return { platform, handle, status: "unknown" };

  try {
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DomainChecker/1.0)",
      },
      signal: AbortSignal.timeout(5000),
    });

    // 404 = available, 200 = taken, anything else = unknown
    if (resp.status === 404) return { platform, handle, status: "available" };
    if (resp.status === 200) return { platform, handle, status: "taken" };
    return { platform, handle, status: "unknown" };
  } catch {
    return { platform, handle, status: "unknown" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      throw new Error("Missing domain parameter");
    }

    // Extract the name part (without TLD)
    const name = domain.toLowerCase().replace(/^www\./, "").split(".")[0].replace(/[^a-z0-9]/g, "");
    if (!name || name.length < 2) {
      throw new Error("Invalid domain name");
    }

    // Check multiple platforms in parallel
    const platforms = ["twitter", "instagram", "github", "tiktok"];
    const results = await Promise.all(
      platforms.map((p) => checkHandle(p, name))
    );

    const availableCount = results.filter(r => r.status === "available").length;
    const takenCount = results.filter(r => r.status === "taken").length;

    let summary: string;
    if (availableCount === platforms.length) {
      summary = `@${name} is available on all checked platforms — excellent brand defensibility`;
    } else if (availableCount >= 2) {
      summary = `@${name} is available on ${availableCount}/${platforms.length} platforms — good brand potential`;
    } else if (takenCount === platforms.length) {
      summary = `@${name} is taken on all checked platforms — may face brand competition`;
    } else {
      summary = `@${name} has mixed availability — check individual platforms`;
    }

    return new Response(
      JSON.stringify({ handle: name, results, summary, availableCount, takenCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-social-handles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
