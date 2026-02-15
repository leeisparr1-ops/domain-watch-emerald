import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

// ─── Lightweight scoring engine (server-side port) ───

const VOWELS = new Set("aeiouy");

const GOOD_BIGRAMS = new Set([
  "th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","of",
  "ed","is","it","al","ar","st","to","nt","ng","se","ha","as","ou","io","le",
  "ve","co","me","de","hi","ri","ro","ic","ne","ea","ra","ce","li","ch","ll",
  "be","ma","si","om","ur","ca","el","ta","la","ns","ge","ly","ei","os","il",
  "no","pe","do","su","pa","ec","ac","ot","di","ol","tr","sh","pr","pl","cr",
  "bl","fl","gr","br","cl","dr","fr","gl","sl","sp","sw","tw","wr","sc","sk",
  "sm","sn","sq",
]);

const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}|^[bcdfghjklmnpqrstvwxz]{3}|[bcdfghjklmnpqrstvwxz]{3}$/i;

// Compact dictionary — top ~800 words sufficient for server-side scoring
const DICT_WORDS = new Set([
  "go","my","up","do","no","so","we","be","me","he","it","in","on","at","to","or","an","by","if","of",
  "the","and","for","get","buy","top","hot","big","new","now","all","one","two","web","app","hub","pro",
  "fix","max","pay","bet","bit","fit","hit","kit","let","net","pet","set","yet","dot","got","lot","not",
  "pot","cut","gut","hut","nut","put","run","fun","sun","car","bar","far","air","day","way","say","may",
  "try","fly","sky","dry","eye","use","see","old","own","out","off","job","box","dog","log","fog","red",
  "bed","cup","map","hat","ice","age","add","arm","art","bag","ban","bow","bus","can","cap","cow","dam",
  "dip","due","ear","eat","egg","end","era","fan","fat","fee","few","fig","fin","fur","gap","gas","gem",
  "gin","gum","gun","gym","hen","hip","hog","hop","ink","inn","ion","ivy","jam","jar","jaw","jet","jog",
  "joy","jug","key","kin","lab","lap","law","lay","leg","lid","lip","lit","low","mad","man","mat","men",
  "mid","mix","mob","mom","mop","mud","mug","nap","nor","oak","oar","oat","odd","oil","opt","orb","ore",
  "owl","pad","pan","paw","pea","pen","pie","pig","pin","pit","pod","pop","pub","pug","ram","ran","rap",
  "rat","raw","ray","rib","rid","rim","rip","rob","rod","rot","row","rug","rum","rut","sad","sap","sat",
  "saw","sea","sew","shy","sin","sip","sir","sit","six","ski","sly","sob","sod","son","sow","spa","spy",
  "sum","tab","tag","tan","tap","tar","tea","ten","tie","tin","tip","toe","ton","tow","toy","tub","tug",
  "van","vat","vet","vow","wag","war","wax","wig","win","wit","wok","won","woo","yam","yap","yew","zip","zoo",
  "deal","find","save","best","free","fast","easy","home","shop","club","life","love","live","work","play",
  "game","food","tech","auto","book","cash","code","cool","core","data","edge","fire","flex","flow","gold",
  "grid","grow","hack","idea","info","jump","king","labs","link","loop","mind","mode","next","open","pack",
  "path","peak","plan","plus","push","rank","real","ring","rise","road","rock","rush","seed","snap","solo",
  "spot","star","sure","swap","sync","team","time","tool","true","turn","unit","vast","view","volt","wave",
  "wise","word","wrap","zero","zone","buzz","chat","chip","city","coin","copy","desk","disk","dock","drop",
  "edit","farm","film","firm","flag","fold","fork","form","fuel","gain","gate","gear","gift","glow","grab",
  "grip","hash","hawk","heat","help","high","hint","hook","host","hunt","icon","item","join","just","keen",
  "keep","kick","kind","land","last","lead","leaf","lean","lift","line","list","load","lock","long","loom",
  "loot","luck","made","mail","main","make","mark","mart","mass","mate","mega","mesh","mile","mill","mine",
  "mint","miss","mood","moon","more","move","much","muse","name","near","nest","node","note","odds","pace",
  "page","pair","palm","part","pass","past","pick","pine","pipe","plug","poll","pool","port","post","pure",
  "quiz","race","raft","raid","rail","rain","rare","rate","reed","reef","reel","rent","rest","rich","ride",
  "role","roll","root","rope","rule","safe","sage","sail","sale","salt","sand","scan","seal","seek","self",
  "sell","send","ship","show","side","sign","silk","site","size","skip","slot","slow","snow","soft","sort",
  "soul","spin","stem","step","stop","suit","surf","tail","take","talk","tank","tape","task","tell","tend",
  "test","text","tide","tier","tile","tiny","tone","tops","tour","town","tree","trim","trip","tube","tune",
  "type","used","vale","vibe","vine","void","vote","wage","wait","walk","wall","want","ward","warm","wash",
  "weak","wear","week","well","west","wide","wild","will","wind","wine","wing","wire","wish","wood","yard",
  "cube","bike","bone","bore","cage","cake","came","cape","care","case","cave","dare","date","dice","dime",
  "dine","dive","dome","done","dose","dove","duke","dune","face","fade","fame","fare","fate","file","fine",
  "five","fore","fume","fuse","gave","gaze","gone","gore","hare","hate","have","haze","here","hide","hike",
  "hire","hole","hope","hose","huge","jade","joke","kite","lace","lake","lame","lane","late","lime","lobe",
  "lone","lore","lose","lure","mace","mare","maze","mice","mole","mule","mute","nice","nine","none","nose",
  "pale","pane","pare","pave","pile","poke","pole","pore","pose","rage","rake","rave","rice","rife","rime",
  "ripe","robe","rode","rose","rude","sake","same","sane","shoe","some","sore","tame","tire","tore","tote",
  "vice","wade","wake","wane","ware","wile","wipe","woke","wove","yoke",
  "boost","brain","brand","build","buyer","chain","cheap","clean","click","close","cloud","coach","craft",
  "cream","crowd","cycle","daily","delta","drive","eagle","earth","elite","email","entry","equal","event",
  "extra","field","first","flash","fleet","float","focus","force","forge","forum","found","fresh","front",
  "funds","giant","grace","grade","grand","grant","grape","graph","green","group","guard","guide","happy",
  "haven","heart","house","human","hyper","index","inner","input","intel","judge","juice","laser","layer",
  "level","light","local","logic","maker","maple","match","media","merge","micro","model","money","motor",
  "mount","music","noble","north","noted","novel","ocean","offer","order","outer","owner","panel","parse",
  "party","patch","penny","phase","phone","piece","pilot","pixel","place","plant","plaza","point","power",
  "press","price","prime","print","prize","proof","pulse","punch","quest","queue","quick","quote","radar",
  "radio","raise","range","rapid","reach","ready","realm","reign","relay","renew","rider","right","river",
  "robin","royal","rural","sauce","scale","scene","scope","score","scout","sense","serve","seven","shape",
  "share","shift","shine","sight","sigma","skill","slate","sleep","slide","small","smart","smile","snack",
  "solar","solid","solve","south","space","spark","speak","speed","spice","spike","spine","split","stack",
  "stage","stake","stand","start","state","steam","steel","steep","stock","stone","store","storm","story",
  "stove","strap","strip","study","style","sugar","super","surge","sweet","swift","swipe","table","taste",
  "theme","think","tiger","titan","token","total","touch","tower","trace","track","trade","trail","train",
  "trait","trend","trial","tribe","trick","trust","turbo","twist","ultra","union","unity","upper","urban",
  "usage","valid","value","vault","venue","vigor","viral","voice","watch","water","whale","wheel","white",
  "world","worth","yield",
  "action","anchor","beyond","bridge","bright","bundle","canvas","center","choice","circle","clinic",
  "crypto","custom","decode","delete","design","direct","domain","double","enable","energy","engine",
  "expert","falcon","filter","finder","flight","global","golden","growth","health","impact","import",
  "inside","invest","launch","leader","legend","market","master","matrix","method","mobile","modern",
  "motion","native","nature","online","option","output","palace","partner","pocket","portal","profit",
  "public","purple","ranking","record","remote","report","result","rocket","sample","search","secure",
  "select","signal","silver","simple","single","social","source","sphere","sprint","square","status",
  "stream","street","string","strike","strong","studio","summit","supply","switch","system","target",
  "thread","ticket","timber","toggle","travel","triple","unique","unlock","update","venture","vision","wonder",
  // Additional keywords for scoring accuracy
  "mortgage","calculator","loan","credit","insurance","arcade","quotes","learning","teaching",
  "weather","fitness","recipe","cooking","gaming","trading","banking","shopping","hosting",
  "parking","booking","dating","meeting","wedding","garden","kitchen","bathroom","bedroom",
  "furniture","cleaning","comfort","therapy","wellness","medical","doctor","nurse",
]);

const PREMIUM_KEYWORDS = new Set([
  "ai","cloud","data","crypto","meta","block","chain","token","nft","defi","web3",
  "tech","cyber","digital","smart","auto","bot","app","saas","api","dev","code",
  "pay","bank","fund","trade","invest","fintech","insure","credit","wealth",
  "health","med","bio","gene","fit","care","pharma","vita",
  "green","solar","eco","clean","earth","carbon","sustain",
  "learn","edu","skill","train","tutor","academy","course",
  "shop","mart","store","deal","market","brand","retail",
  "home","nest","haven","space","hub","base","zone","spot","lab","forge",
  "pet","paw","vet",
  "food","chef","cook","meal","recipe","eat","taste","bistro","grill",
  "game","play","bet","win","quest","arcade","score",
  "travel","trip","tour","fly","stay","nomad",
  "beauty","glow","skin","hair","style","luxe",
]);

const OFFENSIVE_WORDS = new Set([
  "poo","poop","stain","crap","damn","hell","ass","butt","fart","pee","wee","snot","barf","vomit","puke",
  "shit","fuck","dick","cock","porn","sex","xxx","bitch","slut","whore","twat","cunt","boob","tit",
  "nude","naked","kill","murder","hate","racist","spam","scam","fraud","fake","suck","dumb","stupid",
  "ugly","loser","creep","stink","smelly","gross","nasty","sleazy","trashy","filthy","dirty",
  "jerk","idiot","moron","anus","penis","vagina",
]);

const NEGATIVE_BRAND_WORDS = new Set([
  "lost","lose","dead","death","die","dying","kill","grave","tomb","ghost","doom","curse","decay",
  "rot","ruin","fail","broke","broken","crash","error","bug","fault","flaw","void","null","empty",
  "blank","pain","hurt","sick","ill","disease","toxic","poison","burn","bleed","wound","scar","cry",
  "tear","grief","sad","misery","agony","cheap","poor","weak","slow","dull","dark","grim","bleak",
  "cold","harsh","bitter","sour","stale","flat","limp","lazy","boring","bland","plain","basic",
  "generic","average","mediocre","fear","scare","dread","panic","risk","threat","danger","hazard",
  "trap","cage","bind","stuck","war","fight","clash","conflict","enemy","rival","battle","struggle",
  "chaos","mess","wreck",
]);

// Top ~200 well-known brands for trademark check
const KNOWN_BRANDS = new Set([
  "google","apple","microsoft","amazon","facebook","meta","netflix","spotify","tesla","nvidia",
  "intel","amd","samsung","sony","tiktok","snapchat","twitter","instagram","whatsapp","linkedin",
  "pinterest","reddit","discord","uber","lyft","airbnb","stripe","paypal","shopify","squarespace",
  "wordpress","salesforce","oracle","cisco","adobe","dropbox","slack","zoom","twitch","youtube",
  "github","openai","anthropic","chatgpt","alibaba","tencent","baidu","huawei","xiaomi",
  "nike","adidas","puma","gucci","prada","chanel","rolex","zara","uniqlo","lululemon",
  "toyota","honda","ford","bmw","mercedes","audi","porsche","ferrari","tesla","volvo",
  "cocacola","pepsi","starbucks","mcdonalds","redbull","nestle",
  "visa","mastercard","paypal","chase","jpmorgan","goldman","robinhood","coinbase","binance",
  "walmart","target","costco","ikea","ebay","etsy","disney","nintendo","playstation","xbox",
  "pfizer","moderna","roche","novartis",
]);

function isKnownWord(w: string): boolean {
  return DICT_WORDS.has(w) || PREMIUM_KEYWORDS.has(w);
}

function dictionaryCoverage(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length <= 1) return 0;
  if (lower.length <= 3) return isKnownWord(lower) ? 1.0 : 0;
  const n = lower.length;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = lower.substring(start, i);
      if (isKnownWord(candidate)) {
        dp[i] = Math.max(dp[i], dp[start] + len);
      }
    }
  }
  return dp[n] / n;
}

function splitIntoWords(name: string): string[] {
  const s = name.toLowerCase().replace(/[^a-z]/g, "");
  const n = s.length;
  if (n === 0) return [];
  const dp = new Array(n + 1).fill(0);
  const parent: (null | { start: number; wordLen: number })[] = new Array(n + 1).fill(null);
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    parent[i] = null;
    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = s.substring(start, i);
      if (isKnownWord(candidate)) {
        const coverage = dp[start] + len;
        if (coverage > dp[i]) {
          dp[i] = coverage;
          parent[i] = { start, wordLen: len };
        }
      }
    }
  }
  const words: string[] = [];
  let pos = n;
  while (pos > 0) {
    const p = parent[pos];
    if (p) {
      words.push(s.substring(p.start, p.start + p.wordLen));
      pos = p.start;
    } else {
      pos--;
    }
  }
  words.reverse();
  return words;
}

function countWords(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length <= 2) return 1;
  const words: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let best = 1;
    for (let len = Math.min(lower.length - i, 10); len >= 2; len--) {
      if (DICT_WORDS.has(lower.slice(i, i + len))) { best = len; break; }
    }
    if (best >= 2) { words.push(lower.slice(i, i + best)); i += best; }
    else { if (words.length > 0) words[words.length - 1] += lower[i]; else words.push(lower[i]); i++; }
  }
  return words.filter(w => w.length >= 2).length || 1;
}

// ─── Pronounceability scorer (simplified) ───
function scorePronounceability(domain: string): number {
  const name = domain.split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (!name) return 0;
  let score = 50;
  
  // Length
  if (name.length <= 8 && name.length >= 4) score += 15;
  else if (name.length <= 12) score += 5;
  else score -= 10;
  
  // Word count
  const wc = countWords(name);
  if (wc === 1) score += 5;
  else if (wc === 2) score += 2;
  else if (wc === 3) score -= 5;
  else score -= 15;
  
  // Vowel ratio
  const vowelCount = [...name].filter(c => VOWELS.has(c)).length;
  const ratio = vowelCount / name.length;
  if (ratio >= 0.3 && ratio <= 0.55) score += 15;
  else if (ratio >= 0.2 && ratio <= 0.65) score += 5;
  else score -= 15;
  
  // Consonant clusters
  if (BAD_CLUSTERS.test(name)) score -= 20;
  else score += 10;
  
  // Bigrams
  let goodBigrams = 0;
  for (let i = 0; i < name.length - 1; i++) {
    if (GOOD_BIGRAMS.has(name.slice(i, i + 2))) goodBigrams++;
  }
  const bigramRatio = name.length > 1 ? goodBigrams / (name.length - 1) : 0;
  if (bigramRatio >= 0.5) score += 15;
  else if (bigramRatio >= 0.25) score += 5;
  else score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

// ─── Brandability scorer (simplified) ───
function scoreBrandability(domain: string): number {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const rawName = parts[0];
  const cleanName = rawName.replace(/[-_]/g, "").replace(/[^a-z]/gi, "");
  if (!cleanName) return 0;
  
  const coverage = dictionaryCoverage(cleanName);
  const hasHyphen = rawName.includes("-");
  const foundWords = splitIntoWords(cleanName);
  const bothDict = foundWords.length === 2 && foundWords.every(w => isKnownWord(w));
  const hasPremium = foundWords.some(w => PREMIUM_KEYWORDS.has(w));
  const wc = countWords(cleanName);
  const isPremiumShort = cleanName.length <= 3 && isKnownWord(cleanName);
  const isSingleReal = coverage >= 0.95 && cleanName.length >= 3 && cleanName.length <= 10;
  
  // Check offensive
  let offMult = 1.0;
  const lower = cleanName.toLowerCase();
  let offCount = 0;
  for (const w of OFFENSIVE_WORDS) { if (lower.includes(w)) offCount++; }
  if (offCount >= 2) offMult = 0.15;
  else if (offCount === 1) offMult = 0.55;
  
  // Negative brand words
  let negMult = 1.0;
  const negCount = foundWords.filter(w => NEGATIVE_BRAND_WORDS.has(w)).length;
  if (negCount >= 2) negMult = 0.4;
  else if (negCount === 1) negMult = 0.65;
  
  // Pronounceability dimension (weight 0.25)
  let pronounce = scorePronounceability(domain);
  if (isPremiumShort) pronounce = Math.max(pronounce, 85);
  
  // Length dimension (weight 0.15)
  let lengthScore: number;
  if (cleanName.length <= 3) lengthScore = 98;
  else if (cleanName.length <= 5) lengthScore = 90;
  else if (cleanName.length <= 8) lengthScore = 75;
  else if (cleanName.length <= 12) lengthScore = 50;
  else if (cleanName.length <= 16) lengthScore = 35;
  else lengthScore = 25;
  if (cleanName.length > 12 && coverage >= 0.9 && bothDict) lengthScore = Math.max(lengthScore, 40);
  
  // Word structure (weight 0.15)
  let wordScore: number;
  if (isPremiumShort) wordScore = 98;
  else if (isSingleReal && !hasHyphen) wordScore = 95;
  else if (bothDict && hasPremium && !hasHyphen) wordScore = 95;
  else if (bothDict && !hasHyphen && foundWords.every(w => w.length <= 6)) wordScore = 90;
  else if (bothDict && !hasHyphen) wordScore = 85;
  else if (hasPremium && coverage >= 0.6 && !hasHyphen) wordScore = 78;
  else if (coverage >= 0.9 && foundWords.length === 2 && !hasHyphen) wordScore = 72;
  else if (coverage >= 0.9 && !hasHyphen) wordScore = 70;
  else if (coverage >= 0.6) wordScore = 62;
  else if (pronounce >= 60 && cleanName.length <= 8) wordScore = 55;
  else if (pronounce >= 60) wordScore = 40;
  else if (coverage >= 0.3) wordScore = 20;
  else wordScore = 5;
  if (hasHyphen) wordScore = Math.max(0, wordScore - 35);
  
  // Trademark (weight 0.15)
  let tmScore = 100;
  const normalizedName = lower.replace(/[-_]/g, "");
  for (const brand of KNOWN_BRANDS) {
    if (brand.length < 3) continue;
    if (normalizedName === brand) { tmScore = 5; break; }
    if (normalizedName.includes(brand) && brand.length >= 4) { tmScore = Math.min(tmScore, 35); }
  }
  
  // Memorability (weight 0.15)
  let memScore = 60;
  if (cleanName.length <= 3) memScore += 35;
  else if (cleanName.length <= 5) memScore += 25;
  else if (cleanName.length <= 8) memScore += 15;
  else if (cleanName.length <= 12) memScore += 5;
  else memScore -= 15;
  if (wc === 1) memScore += 15;
  else if (wc === 2) memScore += 5;
  else memScore -= 10;
  memScore = Math.max(0, Math.min(100, memScore));
  
  // Visual (weight 0.15)
  let visualScore = 80;
  if (/(.)\1{2,}/i.test(cleanName)) visualScore -= 25;
  if (cleanName.includes("-")) visualScore -= 30;
  if (/^[a-z]+$/i.test(cleanName)) visualScore += 10;
  if (cleanName.length >= 4 && cleanName.length <= 10) visualScore += 10;
  visualScore = Math.max(0, Math.min(100, visualScore));
  
  const raw = pronounce * 0.25 + lengthScore * 0.15 + wordScore * 0.15 + tmScore * 0.15 + memScore * 0.15 + visualScore * 0.15;
  return Math.round(raw * offMult * negMult);
}

// ─── Trademark risk (simplified) ───
function checkTrademarkRisk(domain: string): string {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const rawName = parts[0].replace(/[-_]/g, "");
  for (const brand of KNOWN_BRANDS) {
    if (brand.length < 3) continue;
    if (rawName === brand) return "high";
    if (rawName.includes(brand) && brand.length >= 4) return "medium";
  }
  return "none";
}

// ─── Main handler ───

interface ScoreRequest {
  mode: "batch" | "audit";
  domain_names?: string[]; // for batch mode
  limit?: number;          // for audit mode (default 500)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncSecret = req.headers.get("x-sync-secret");
    const expectedSecret = Deno.env.get("SYNC_SECRET");

    if (!expectedSecret || !syncSecret || syncSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ScoreRequest = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let domains: { domain_name: string }[] = [];

    if (body.mode === "batch" && body.domain_names?.length) {
      // Score specific domains (called after sync)
      domains = body.domain_names.map(d => ({ domain_name: d }));
    } else {
      // Audit mode: pick unscored or stale domains
      const limit = body.limit || 500;
      const { data, error } = await supabase
        .from("auctions")
        .select("domain_name")
        .or("scores_computed_at.is.null,scores_computed_at.lt." + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(limit);
      
      if (error) {
        console.error("Error fetching domains:", error.message);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      domains = data || [];
    }

    if (domains.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scored: 0, message: "No domains to score" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scoring ${domains.length} domains (mode: ${body.mode})`);

    // Compute scores and update in batches
    const BATCH_SIZE = 100;
    let scored = 0;
    let errors = 0;

    for (let i = 0; i < domains.length; i += BATCH_SIZE) {
      const batch = domains.slice(i, i + BATCH_SIZE);
      const now = new Date().toISOString();
      
      const updates = batch.map(d => ({
        domain_name: d.domain_name,
        brandability_score: scoreBrandability(d.domain_name),
        pronounceability_score: scorePronounceability(d.domain_name),
        trademark_risk: checkTrademarkRisk(d.domain_name),
        scores_computed_at: now,
      }));

      const { error } = await supabase
        .from("auctions")
        .upsert(updates, { onConflict: "domain_name", ignoreDuplicates: false });

      if (error) {
        console.error(`Batch error at ${i}: ${error.message}`);
        errors++;
      } else {
        scored += batch.length;
      }

      // Brief pause between batches
      if (i + BATCH_SIZE < domains.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    console.log(`Scored ${scored} domains, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, scored, errors, mode: body.mode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
