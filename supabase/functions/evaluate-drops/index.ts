import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_BATCH_SIZE = 25;
const DOMAINS_PER_INVOCATION = 500;

// ─── FAST HEURISTIC PRE-SCREEN ───
// Mirrors the platform's brandability/pronounceability signals without needing src/lib imports

const VOWELS = new Set("aeiouy");
const CONSONANTS = new Set("bcdfghjklmnpqrstvwxz");

const GOOD_BIGRAMS = new Set([
  "th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","ed","is","it","al","ar",
  "st","nt","ng","se","ha","as","ou","io","le","ve","co","me","de","hi","ri","ro","ic","ne","ea",
  "ra","ce","li","ch","ll","be","ma","si","om","ur","ca","el","ta","la","ns","ge","ly","ei","os",
  "no","pe","do","su","pa","ec","ac","di","ol","tr","sh","pr","pl","cr","bl","fl","gr","br","cl",
  "dr","fr","gl","sl","sp","sw","tw","wr","sc","sk","sm","sn",
]);

const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}/i;

// High-value keywords that signal commercial intent
const HIGH_VALUE_KEYWORDS = new Set([
  // Tech/AI
  "ai","tech","data","cloud","app","web","dev","code","bot","api","iot","ml","gpu","cpu","saas","cyber",
  "smart","logic","mind","core","sync","flow","link","base","stack","hub","lab","gen","net",
  // Finance
  "pay","fin","fund","cash","bank","loan","coin","crypto","trade","invest","money","wealth","capital",
  // Health
  "health","med","bio","care","fit","well","vita","pharma","clinic","therapy",
  // Commerce
  "shop","store","buy","sell","deal","market","brand","retail","mall","cart",
  // Brandable suffixes/prefixes
  "nova","vox","plex","zen","neo","pro","max","ultra","prime","apex","meta","omni","versa",
  "ify","able","ware","ology","verse","scape","craft","works","forge","labs",
  // Real estate / geo
  "home","house","land","city","town","realty","estate","rent","lease",
  // Media / creative
  "media","studio","design","pixel","photo","video","film","music","art","story",
  // Other high-value
  "solar","green","eco","energy","power","motor","auto","drone","robot","space",
  "food","chef","cook","taste","fresh","organic",
  "travel","tour","trip","hotel","flight","cruise",
  "learn","tutor","study","school","edu","academy","course",
  "legal","law","attorney","counsel",
  "pet","dog","cat","vet",
  "game","play","sport","team","fan","score",
  "social","chat","meet","date","match",
  "secure","guard","safe","shield","vault","trust",
]);

// Common English words for word-splitting detection
const COMMON_WORDS = new Set([
  // 2-letter
  "go","my","up","do","no","so","we","be","me","he","it","in","on","at","to","or","an","by","if","of",
  // 3-letter
  "the","and","for","get","buy","top","hot","big","new","now","all","one","two","web","app","hub","pro",
  "fix","max","pay","bet","bit","fit","hit","kit","let","net","pet","set","yet","dot","got","lot","not",
  "pot","cut","gut","hut","nut","put","run","fun","sun","car","bar","far","air","day","way","say","may",
  "try","fly","sky","dry","eye","use","see","old","own","out","off","job","box","dog","log","red","bed",
  "cup","map","hat","ice","age","add","arm","art","bag","ban","bow","bus","can","cap","cow","ear","eat",
  "egg","end","era","fan","fat","fee","few","fin","fur","gap","gas","gem","gin","gum","gun","gym","hen",
  "hip","hop","ink","inn","ion","jam","jar","jaw","jet","jog","joy","jug","key","kin","lab","lap","law",
  "lay","leg","lid","lip","lit","low","mad","man","mat","men","mid","mix","mob","mom","mop","mud","mug",
  "nap","oak","oar","oat","odd","oil","opt","ore","owl","pad","pan","paw","pea","pen","pie","pig","pin",
  "pit","pod","pop","pub","pug","ram","ran","rap","rat","raw","ray","rib","rid","rim","rip","rob","rod",
  "rot","row","rug","rum","rut","sad","sap","sat","saw","sea","sew","shy","sin","sip","sir","sit","six",
  "ski","sly","sob","son","sow","spa","spy","sum","tab","tag","tan","tap","tar","tea","ten","tie","tin",
  "tip","toe","ton","tow","toy","tub","tug","van","vat","vet","vow","wag","war","wax","wig","win","wit",
  "won","woo","yam","zip","zoo",
  // 4-letter
  "deal","find","save","best","free","fast","easy","home","shop","club","life","love","live","work","play",
  "game","food","tech","auto","book","cash","code","cool","core","data","edge","fire","flex","flow","gold",
  "grid","grow","hack","idea","info","jump","king","labs","link","loop","mind","mode","next","open","pack",
  "path","peak","plan","plus","push","rank","real","ring","rise","road","rock","rush","seed","snap","solo",
  "spot","star","sure","swap","sync","team","time","tool","true","turn","unit","vast","view","volt","wave",
  "wise","word","wrap","zero","zone","buzz","chat","chip","city","coin","copy","desk","disk","dock","drop",
  "edit","farm","film","firm","flag","fold","fork","form","fuel","gain","gate","gear","gift","glow","grab",
  "grip","hash","hawk","heat","help","high","hint","hook","host","hunt","icon","item","join","just","keen",
  "keep","kick","kind","land","last","lead","leaf","lean","lift","line","list","load","lock","long","luck",
  "made","mail","main","make","mark","mart","mass","mate","mega","mesh","mile","mill","mine","mint","miss",
  "mood","moon","more","move","much","muse","name","near","nest","node","note","pace","page","pair","palm",
  "part","pass","past","pick","pine","pipe","plug","poll","pool","port","post","pure","quiz","race","raft",
  "raid","rail","rain","rare","rate","reed","reef","reel","rent","rest","rich","ride","role","roll","root",
  "rope","rule","safe","sage","sail","sale","salt","sand","scan","seal","seek","self","sell","send","ship",
  "show","side","sign","silk","site","size","skip","slot","slow","snow","soft","sort","soul","spin","stem",
  "step","stop","suit","surf","tail","take","talk","tank","tape","task","tell","tend","test","text","tide",
  "tier","tile","tiny","tone","tops","tour","town","tree","trim","trip","tube","tune","type","used","vale",
  "vibe","vine","void","vote","wage","wait","walk","wall","want","ward","warm","wash","weak","wear","week",
  "well","west","wide","wild","will","wind","wine","wing","wire","wish","wood","yard","blue","bone","cage",
  "cake","cape","care","case","cave","dare","date","dice","dime","dine","dive","dome","done","dose","dove",
  "duke","dune","face","fade","fame","fare","fate","file","fine","five","fore","frog","fuse","gave","gaze",
  "gone","gore","hare","hate","have","haze","here","hide","hike","hire","hole","hope","hose","huge","jade",
  "joke","kite","lace","lake","lame","lane","late","lime","lobe","lone","lore","lose","lure","mace","mare",
  "maze","mice","mire","mole","mule","mute","nice","nine","none","nose","pale","pane","pare","pave","pile",
  "poke","pole","pore","pose","rage","rake","rave","raze","rice","rife","rime","ripe","robe","rode","rose",
  "rude","sake","same","sane","shoe","some","sore","tame","tire","tore","tote","vice","wade","wake","wane",
  "ware","wile","wipe","woke","wove","yoke",
  // 5-letter
  "boost","brain","brand","build","buyer","chain","clean","click","close","cloud","coach","craft","crowd",
  "cycle","daily","delta","drive","eagle","earth","elite","email","entry","equal","event","extra","field",
  "first","flash","fleet","float","focus","force","forge","forum","found","fresh","front","funds","giant",
  "grace","grade","grand","grant","grape","graph","green","group","guard","guide","happy","haven","heart",
  "house","human","hyper","index","inner","input","intel","judge","juice","laser","layer","level","light",
  "local","logic","maker","maple","match","media","merge","micro","model","money","motor","mount","music",
  "noble","north","novel","ocean","offer","order","outer","owner","panel","party","patch","penny","phase",
  "phone","piece","pilot","pixel","place","plant","plaza","point","power","press","price","prime","print",
  "prize","proof","pulse","punch","quest","queue","quick","quote","radar","radio","raise","range","rapid",
  "reach","ready","realm","reign","relay","renew","rider","right","river","robin","royal","rural","sauce",
  "scale","scene","scope","score","scout","sense","serve","seven","shape","share","shift","shine","sight",
  "sigma","skill","slate","sleep","slide","small","smart","smile","snack","solar","solid","solve","south",
  "space","spark","speak","speed","spice","spike","spine","split","stack","stage","stake","stand","start",
  "state","steam","steel","stock","stone","store","storm","story","stove","strap","strip","study","style",
  "sugar","super","surge","sweet","swift","swipe","table","taste","theme","think","tiger","titan","token",
  "total","touch","tower","trace","track","trade","trail","train","trait","trend","trial","tribe","trick",
  "trust","turbo","twist","ultra","union","unity","upper","urban","usage","valid","value","vault","venue",
  "vigor","viral","voice","watch","water","whale","wheel","white","world","worth","yield",
  // 6+ letter
  "action","anchor","beyond","bridge","bright","bundle","canvas","center","choice","circle","clinic",
  "crypto","custom","decode","design","direct","domain","double","enable","energy","engine","expert",
  "falcon","filter","finder","flight","global","golden","growth","health","impact","inside","invest",
  "launch","leader","legend","market","master","matrix","method","mobile","modern","motion","native",
  "nature","online","option","output","palace","partner","pocket","portal","profit","public","purple",
  "ranking","record","remote","report","result","rocket","sample","search","secure","select","signal",
  "silver","simple","single","social","source","sphere","sprint","square","status","stream","street",
  "string","strike","strong","studio","summit","supply","switch","system","target","thread","ticket",
  "timber","toggle","travel","triple","unique","unlock","update","venture","vision","wonder",
]);

// Offensive words to immediately reject
const OFFENSIVE = new Set([
  "porn","xxx","sex","fuck","shit","dick","cock","bitch","slut","whore","twat","cunt",
  "nude","naked","kill","murder","hate","racist","spam","scam","fraud",
]);

/**
 * Split domain SLD into recognized words using greedy longest-match.
 * Returns { words: string[], coverage: number (0-1) }
 */
function splitWords(sld: string): { words: string[]; coverage: number } {
  const lower = sld.toLowerCase();
  const words: string[] = [];
  let covered = 0;
  let i = 0;

  while (i < lower.length) {
    let best = 0;
    for (let len = Math.min(lower.length - i, 10); len >= 2; len--) {
      const candidate = lower.slice(i, i + len);
      if (COMMON_WORDS.has(candidate) || HIGH_VALUE_KEYWORDS.has(candidate)) {
        best = len;
        break;
      }
    }
    if (best >= 2) {
      words.push(lower.slice(i, i + best));
      covered += best;
      i += best;
    } else {
      i++;
    }
  }

  return { words, coverage: lower.length > 0 ? covered / lower.length : 0 };
}

/**
 * Fast heuristic quality score (0-100) for a domain SLD.
 * Uses the same signals as the platform's brandability + pronounceability engines.
 */
function quickQualityScore(sld: string): number {
  const lower = sld.toLowerCase();
  const len = lower.length;
  let score = 0;

  // 1. Offensive check — instant reject
  for (const word of OFFENSIVE) {
    if (lower.includes(word)) return 0;
  }

  // 2. Length scoring (max 25 pts) — sweet spot is 4-8 chars
  if (len <= 3) score += 20;
  else if (len <= 5) score += 25;
  else if (len <= 8) score += 22;
  else if (len <= 10) score += 15;
  else if (len <= 12) score += 10;
  else if (len <= 15) score += 5;
  else if (len <= 20) score += 2;
  else score += 0;

  // 3. Vowel ratio (max 15 pts) — pronounceable names have 30-50% vowels
  const vowelCount = [...lower].filter(c => VOWELS.has(c)).length;
  const vowelRatio = vowelCount / len;
  if (vowelRatio >= 0.25 && vowelRatio <= 0.55) score += 15;
  else if (vowelRatio >= 0.2 && vowelRatio <= 0.6) score += 10;
  else if (vowelRatio >= 0.15) score += 5;
  // All consonants or all vowels = 0

  // 4. Consonant cluster penalty (max -15 pts)
  if (BAD_CLUSTERS.test(lower)) score -= 15;

  // 5. Bigram quality (max 15 pts)
  let goodBigrams = 0;
  let totalBigrams = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    const bi = lower.slice(i, i + 2);
    totalBigrams++;
    if (GOOD_BIGRAMS.has(bi)) goodBigrams++;
  }
  const bigramRatio = totalBigrams > 0 ? goodBigrams / totalBigrams : 0;
  score += Math.round(bigramRatio * 15);

  // 6. Word recognition (max 25 pts) — domains composed of real words score highest
  const { words, coverage } = splitWords(lower);
  score += Math.round(coverage * 25);

  // 7. High-value keyword bonus (max 15 pts)
  let keywordBonus = 0;
  for (const word of words) {
    if (HIGH_VALUE_KEYWORDS.has(word)) keywordBonus += 8;
  }
  // Also check substrings for shorter keywords (ai, ml, etc.)
  for (const kw of HIGH_VALUE_KEYWORDS) {
    if (kw.length <= 3 && lower.includes(kw) && !words.includes(kw)) {
      keywordBonus += 4;
    }
  }
  score += Math.min(15, keywordBonus);

  // 8. Hyphen penalty (-10) and number penalty (-8)
  if (lower.includes("-")) score -= 10;
  if (/\d/.test(lower)) score -= 8;

  // 9. Repeating characters penalty (e.g., "aaa", "bbb")
  if (/(.)\1{2,}/.test(lower)) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// Minimum quality score to send to AI evaluation
const QUALITY_THRESHOLD = 30;

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

    // If csvText is provided, this is the initial call — parse, pre-screen, store
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

      const totalParsed = lines.length - 1;
      const qualifiedDomains: string[] = [];
      let comCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c: string) => c.trim().replace(/"/g, ""));
        const domain = row[domainCol]?.toLowerCase().trim();
        if (!domain || !domain.endsWith(".com") || domain.length <= 4) continue;

      comCount++;
        const sld = domain.replace(/\.com$/, "");

        // Hard gate: reject hyphens/numbers unless domain contains a high-value keyword
        const hasHyphen = sld.includes("-");
        const hasNumber = /\d/.test(sld);
        if (hasHyphen || hasNumber) {
          const cleanSld = sld.replace(/[-0-9]/g, "");
          const hasHighValue = [...HIGH_VALUE_KEYWORDS].some(kw => kw.length >= 3 && cleanSld.includes(kw));
          if (!hasHighValue) continue;
        }

        // Fast heuristic pre-screen — only domains scoring above threshold get AI evaluation
        const quality = quickQualityScore(sld);
        if (quality >= QUALITY_THRESHOLD) {
          qualifiedDomains.push(domain);
        }
      }

      const domains = [...new Set(qualifiedDomains)];

      console.log(`Pre-screen: ${totalParsed} total → ${comCount} .com → ${domains.length} qualified (threshold: ${QUALITY_THRESHOLD})`);

      // Store qualified domain list and update scan
      await adminClient.from("drop_scans").update({
        total_domains: totalParsed,
        filtered_domains: domains.length,
        status: "evaluating",
        csv_data: domains.join("\n"),
        resume_from: 0,
      }).eq("id", scanId);

      // Self-invoke to start processing
      const selfUrl = `${supabaseUrl}/functions/v1/evaluate-drops`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ scanId }),
      }).catch(err => console.error("Self-chain invoke error:", err));

      return new Response(JSON.stringify({ success: true, queued: true, total: totalParsed, comDomains: comCount, qualified: domains.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Chained invocation: no csvText, just scanId ---
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
      await adminClient.from("drop_scans").update({
        status: "complete",
        csv_data: null,
      }).eq("id", scanId);

      return new Response(JSON.stringify({ success: true, status: "complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process this chunk in AI batches
    let evaluated = startIdx;
    for (let i = 0; i < chunk.length; i += AI_BATCH_SIZE) {
      const batch = chunk.slice(i, i + AI_BATCH_SIZE);

      const prompt = `You are an expert domain name investor and appraiser. Evaluate each domain for its DROP CATCHING investment potential.

For each domain, consider:
- Is it a real word or combo of real words? (highest value)
- Is it short and memorable? (4-8 chars = premium)
- Does it have strong commercial keywords? (tech, pay, health, etc.)
- Is it brandable? Can a startup use it?
- Is it pronounceable? Can you say it easily?
- What's the realistic resale value on aftermarket platforms?

Score STRICTLY — most expiring domains are junk. Only truly good ones should score 70+.
- 85-100: Premium catch (real words, short, high commercial value)
- 70-84: Strong catch (brandable, good keywords, memorable)
- 50-69: Decent potential (usable but not exceptional)
- 30-49: Marginal (might find a buyer eventually)
- 1-29: Pass (not worth the reg fee)

For each domain provide:
- score: 1-100 investment quality score (be strict!)
- summary: one-sentence explanation (max 15 words)
- category: one of [brandable, keyword, short, geo, niche, generic, premium, weak]
- estimated_value: realistic USD resale value (most domains are $10-50, only great ones are $500+)
- brandability: 1-100 how brandable/memorable
- keyword_strength: 1-100 keyword commercial value
- length_score: 1-100 based on length desirability

Domains to evaluate:
${batch.join("\n")}

Return a JSON array of objects with keys: domain, score, summary, category, estimated_value, brandability, keyword_strength, length_score`;

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
              { role: "system", content: "You are a domain name investment evaluator. Be STRICT with scores — most expiring domains are mediocre. Return only valid JSON arrays. No markdown." },
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
          length_score: Math.min(100, Math.max(0, Number(r.length_score) || 0)),
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
