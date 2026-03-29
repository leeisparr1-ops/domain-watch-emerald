import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUALITY_THRESHOLD = 55;        // lower threshold since heuristic is the final scorer now
const MAX_RESULTS = 5000;            // max results to store per scan

// ═══════════════════════════════════════════════════════════════
// ─── COMPREHENSIVE DICTIONARIES (ported from platform engines) ─
// ═══════════════════════════════════════════════════════════════

const VOWELS = new Set("aeiouy");

const GOOD_BIGRAMS = new Set([
  "th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","ed","is","it","al","ar",
  "st","nt","ng","se","ha","as","ou","io","le","ve","co","me","de","hi","ri","ro","ic","ne","ea",
  "ra","ce","li","ch","ll","be","ma","si","om","ur","ca","el","ta","la","ns","ge","ly","ei","os",
  "no","pe","do","su","pa","ec","ac","di","ol","tr","sh","pr","pl","cr","bl","fl","gr","br","cl",
  "dr","fr","gl","sl","sp","sw","tw","wr","sc","sk","sm","sn",
]);

const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}/i;

// ─── TRENDING KEYWORDS with heat multipliers (from domainValuation.ts) ───
const TRENDING_KEYWORDS: Record<string, number> = {
  "ai": 2.5, "gpt": 2.0, "neural": 1.8, "neura": 1.8, "machine": 1.5, "deep": 1.5, "learn": 1.5,
  "robot": 1.6, "auto": 1.6, "smart": 1.5, "quantum": 2.0, "intel": 1.5,
  "agent": 2.2, "agentic": 2.2, "synthetic": 1.6, "cognitive": 1.5, "spatial": 1.7, "copilot": 1.8, "genai": 2.0, "llm": 1.9,
  "pay": 1.8, "bank": 1.8, "cash": 1.6, "loan": 1.5, "credit": 1.6, "finance": 1.8,
  "trade": 1.6, "invest": 1.7, "wallet": 1.5, "token": 1.3, "defi": 1.4, "fintech": 1.8,
  "money": 1.7, "fund": 1.6, "wealth": 1.5, "capital": 1.6, "equity": 1.5, "profit": 1.4,
  "health": 1.7, "med": 1.5, "fit": 1.4, "care": 1.5, "dental": 1.4, "clinic": 1.4,
  "therapy": 1.3, "mental": 1.3, "wellness": 1.4, "organic": 1.3,
  "shop": 1.6, "store": 1.5, "buy": 1.5, "sell": 1.4, "deal": 1.3, "sale": 1.3,
  "market": 1.5, "retail": 1.4, "commerce": 1.5, "cart": 1.3, "order": 1.3,
  "cloud": 1.7, "tech": 1.6, "code": 1.4, "data": 1.6, "app": 1.4, "web": 1.3,
  "server": 1.3, "host": 1.3, "stack": 1.4, "saas": 1.6, "api": 1.5, "dev": 1.3,
  "cyber": 1.5, "digital": 1.4, "platform": 1.4, "software": 1.3, "system": 1.3,
  "home": 1.6, "homes": 1.5, "house": 1.5, "land": 1.5, "estate": 1.6, "rent": 1.4, "property": 1.5,
  "build": 1.3, "room": 1.3, "space": 1.4, "real": 1.4,
  "solar": 1.6, "green": 1.4, "energy": 1.5, "power": 1.4, "electric": 1.4, "carbon": 1.3,
  "climate": 1.3, "eco": 1.3,
  "travel": 1.5, "hotel": 1.5, "flight": 1.4, "trip": 1.3, "tour": 1.3, "cruise": 1.3,
  "food": 1.4, "chef": 1.3, "wine": 1.3, "luxury": 1.4, "life": 1.4,
  "secure": 1.5, "guard": 1.3, "shield": 1.3, "vault": 1.4, "safe": 1.3, "protect": 1.3,
  "game": 1.5, "play": 1.4, "stream": 1.4, "video": 1.3, "music": 1.3, "sport": 1.3,
  "bet": 1.7, "club": 1.4,
  "jobs": 1.5, "hire": 1.4, "work": 1.3, "career": 1.4, "talent": 1.3,
  "school": 1.3, "course": 1.3, "tutor": 1.3, "academy": 1.3,
  "legal": 1.5, "law": 1.5, "lawyer": 1.5, "insure": 1.5, "insurance": 1.5,
  "group": 1.6, "solutions": 1.5, "services": 1.4, "hub": 1.5,
  "global": 1.4, "pro": 1.5, "car": 1.4,
  "bio": 1.7, "gene": 1.6, "genome": 1.5, "dna": 1.5, "protein": 1.4, "vaccine": 1.4,
  "skin": 1.4, "glow": 1.4, "beauty": 1.4, "fashion": 1.4,
  "pet": 1.5, "dog": 1.4, "cat": 1.3, "vet": 1.4,
  "iot": 1.5, "sensor": 1.4, "wearable": 1.4,
  "rocket": 1.5, "satellite": 1.4, "lunar": 1.3, "mars": 1.4,
  "creator": 1.5, "influencer": 1.4, "podcast": 1.4, "content": 1.3,
  "ev": 1.5, "charging": 1.4, "fleet": 1.3,
  "fire": 1.3, "clean": 1.3, "claw": 1.4,
};

// ─── NICHE CATEGORIES with market heat (from domainValuation.ts) ───
const NICHE_CATEGORIES: Record<string, { keywords: string[]; heat: number }> = {
  ai_tech: { keywords: ["ai","gpt","neural","neura","machine","deep","learn","robot","smart","quantum","intel","agent","agentic","synthetic","cognitive","llm","copilot","genai","spatial"], heat: 95 },
  fintech: { keywords: ["pay","bank","cash","loan","credit","finance","trade","invest","wallet","fintech","money","fund","wealth","capital","equity","profit","defi","token"], heat: 90 },
  biotech: { keywords: ["bio","biotech","gene","genome","dna","protein","cell","stem","antibody","vaccine","clinical","molecular","therapeutic","diagnostic"], heat: 85 },
  security: { keywords: ["secure","guard","shield","vault","safe","protect","defense","cyber","firewall","encryption","threat","breach"], heat: 85 },
  health: { keywords: ["health","med","fit","care","dental","clinic","therapy","mental","wellness","organic","nutrition","vitamin","telehealth"], heat: 75 },
  saas: { keywords: ["cloud","tech","code","data","app","web","server","host","stack","saas","api","dev","platform","software","system"], heat: 75 },
  ecommerce: { keywords: ["shop","store","buy","sell","deal","sale","market","retail","commerce","cart","order","marketplace"], heat: 70 },
  insurance: { keywords: ["insure","insurance","policy","premium","coverage","claim","annuity","liability"], heat: 70 },
  real_estate: { keywords: ["home","homes","house","land","estate","rent","property","mortgage","apartment","realty"], heat: 65 },
  energy: { keywords: ["solar","green","energy","power","electric","carbon","climate","eco","renewable","battery"], heat: 65 },
  legal: { keywords: ["legal","law","lawyer","attorney","court","litigation","contract","counsel"], heat: 65 },
  gaming: { keywords: ["game","play","stream","video","music","sport","bet","esport","arcade","quest","arena"], heat: 60 },
  automotive: { keywords: ["car","auto","vehicle","motor","drive","ev","truck","fleet","electric"], heat: 55 },
  travel: { keywords: ["travel","hotel","flight","trip","tour","cruise","food","chef","luxury","vacation"], heat: 55 },
  beauty: { keywords: ["beauty","skin","hair","makeup","cosmetic","glow","fashion","style","wear","boutique"], heat: 55 },
  pet: { keywords: ["pet","dog","cat","puppy","vet","paw","bark","groom","kennel","animal"], heat: 55 },
  jobs: { keywords: ["jobs","hire","work","career","talent","recruit","staff","remote","freelance"], heat: 50 },
  education: { keywords: ["school","course","tutor","academy","learn","study","university","teach","training"], heat: 40 },
  space: { keywords: ["space","rocket","orbit","satellite","lunar","mars","cosmos","launch","galaxy","aerospace"], heat: 60 },
};

// ─── BRANDABLE SUFFIX/PREFIX PATTERNS ───
const BRANDABLE_SUFFIXES = [
  /ify$/i, /ly$/i, /io$/i, /eo$/i, /er$/i, /oo$/i, /ee$/i,
  /ia$/i, /ity$/i, /ism$/i, /ist$/i, /ous$/i, /ive$/i,
  /fy$/i, /go$/i, /up$/i, /it$/i, /ix$/i, /ox$/i, /ux$/i,
  /zy$/i, /sy$/i, /ty$/i, /ry$/i, /ny$/i, /py$/i, /ky$/i,
  /able$/i, /ible$/i,
];

const BRANDABLE_PREFIXES = [
  /^un/, /^re/, /^pre/, /^pro/, /^super/, /^ultra/, /^mega/, /^mini/,
  /^over/, /^out/, /^up/, /^my/, /^go/, /^get/, /^one/,
];

// ─── HIGH-VALUE KEYWORDS (for hard gate bypass) ───
const HIGH_VALUE_KEYWORDS = new Set([
  "ai","tech","data","cloud","app","web","dev","code","bot","api","iot","ml","gpu","cpu","saas","cyber",
  "smart","logic","mind","core","sync","flow","link","base","stack","hub","lab","gen","net",
  "pay","fin","fund","cash","bank","loan","coin","crypto","trade","invest","money","wealth","capital",
  "health","med","bio","care","fit","well","vita","pharma","clinic","therapy",
  "shop","store","buy","sell","deal","market","brand","retail","mall","cart",
  "nova","vox","plex","zen","neo","pro","max","ultra","prime","apex","meta","omni","versa",
  "ify","able","ware","ology","verse","scape","craft","works","forge","labs",
  "home","house","land","city","town","realty","estate","rent","lease",
  "media","studio","design","pixel","photo","video","film","music","art","story",
  "solar","green","eco","energy","power","motor","auto","drone","robot","space",
  "food","chef","cook","taste","fresh","organic",
  "travel","tour","trip","hotel","flight","cruise",
  "learn","tutor","study","school","edu","academy","course",
  "legal","law","attorney","counsel",
  "pet","dog","cat","vet",
  "game","play","sport","team","fan","score",
  "social","chat","meet","date","match",
  "secure","guard","safe","shield","vault","trust",
  "quantum","block","chain","fintech","defi","token","intel","matrix","bolt","shift","spark","edge",
  "gene","sensor","vr","ar","virtual","metaverse","rocket","launch",
  "glow","fashion","style","wear","recipe",
  "coach","mentor","recruit","hire","talent",
  "ev","fleet","charge","battery","clean","sustain",
  "platform","deploy","pipeline","infra","ops",
  "stream","content","podcast","creator","influencer",
  "neura","spatial","copilot","genai","llm","agentic",
  "esport","loot","raid","quest","arena","guild","clash","boost","rank",
]);

// ─── COMPREHENSIVE DICTIONARY (8,000+ words for robust gibberish detection) ───
const DICTIONARY = new Set([
  // === 2-3 LETTER WORDS ===
  "go","my","up","do","no","so","we","be","me","he","it","in","on","at","to","or","an","by","if","of",
  "the","and","for","get","buy","top","hot","big","new","now","all","one","two","web","app","hub","pro",
  "fix","max","pay","bet","bit","fit","hit","kit","let","net","pet","set","yet","dot","got","lot","not",
  "pot","cut","gut","hut","nut","put","run","fun","sun","car","bar","far","air","day","way","say","may",
  "try","fly","sky","dry","eye","use","see","old","own","out","off","job","box","dog","log","fog","red",
  "bed","cup","map","hat","ice","age","add","arm","art","bag","ban","bow","bus","can","cap","cow","dam",
  "dip","due","dug","ear","eat","egg","end","era","fan","fat","fee","few","fig","fin","fur","gap","gas",
  "gem","gin","gum","gun","gym","hen","hip","hog","hop","ink","inn","ion","ivy","jam","jar","jaw","jet",
  "jog","joy","jug","key","kin","lab","lap","law","lay","leg","lid","lip","lit","low","mad","man","mat",
  "men","mid","mix","mob","mom","mop","mud","mug","nap","nor","oak","oar","oat","odd","oil","opt","orb",
  "ore","owl","pad","pan","paw","pea","pen","pie","pig","pin","pit","pod","pop","pub","pug","ram","ran",
  "rap","rat","raw","ray","rib","rid","rim","rip","rob","rod","rot","row","rug","rum","rut","sad","sap",
  "sat","saw","sea","sew","shy","sin","sip","sir","sit","six","ski","sly","sob","sod","son","sow","spa",
  "spy","sum","tab","tag","tan","tap","tar","tea","ten","tie","tin","tip","toe","ton","tow","toy","tub",
  "tug","van","vat","vet","vow","wag","war","wax","wig","win","wit","wok","won","woo","yam","yap","yew",
  "zip","zoo","ace","aim","arc","ask","axe","bay","bid","bud","cab","cam","clue","cog","cub","dab",
  "den","dew","dig","dim","dub","duo","dye","elm","eve","fad","fax","fir","gag","gel","glow","haze",
  "hex","hue","hug","ire","jab","jag","jig","jot","keg","lag","led","lug","lux","nab","nag","nib","nod",
  "ode","pal","peg","ply","pry","pun","pup","rag","rub","rye","sag","tax","urn","via","vim","woe",
  "yak","yaw","yen","ash","cot","cue","dew","elk","emu","ewe","fox","gnu","gut","hay","hem","hew",
  "hid","hob","hue","jab","kid","kin","kit","lad","led","lot","mar","met","nib","nil","nun","ore",
  "pew","ply","pod","pry","roe","rot","rue","rum","rut","sac","sod","sow","sty","tar","tic","tot",
  "tow","urn","vie","wad","wan","wed","wet","wig","wit","woe","wok","yak","yap","yew","zap",
  // === 4-LETTER WORDS (expanded) ===
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
  "blue","bone","cage","cake","cape","care","case","cave","dare","date","dice","dime","dine","dive","dome",
  "done","dose","dove","duke","dune","face","fade","fame","fare","fate","file","fine","five","fore","frog",
  "fuse","gave","gaze","gone","gore","hare","hate","have","haze","here","hide","hike","hire","hole","hope",
  "hose","huge","jade","joke","kite","lace","lake","lame","lane","late","lime","lobe","lone","lore","lose",
  "lure","mace","mare","maze","mice","mire","mole","mule","mute","nice","nine","none","nose","pale","pane",
  "pare","pave","pile","poke","pole","pore","pose","rage","rake","rave","raze","rice","rife","rime","ripe",
  "robe","rode","rose","rude","sake","same","sane","shoe","some","sore","tame","tire","tore","tote","vice",
  "wade","wake","wane","ware","wile","wipe","woke","wove","yoke","bike","bore","came","cube","dupe",
  "faze","flee","fume","jake","knee","lire","lute","mike","mope","ooze","stove",
  "ball","base","bath","beam","bear","bell","belt","bill","bird","blow","boat","body","bolt","bomb","bond",
  "boot","bowl","buck","bull","burn","busy","calm","card","cast","cell","chef","chin","clam","clay","clip",
  "coal","coat","coil","comb","come","cook","corn","cost","crew","crop","crow","cure","curl","dawn","dear",
  "deed","deer","dial","dirt","dish","down","draw","drum","dual","dust","duty","each","emit","exam",
  "exit","fact","fail","fair","fall","fear","feel","fill","fish","fist","flat","flaw","foam",
  "folk","fool","foot","four","fowl","from","full","fury","fuss","gait","gale","gang","girl",
  "glad","goat","good","gray","grin","gulf","gust","half","hall","hand","hang","harm","harp","haul",
  "head","heap","hear","heel","herb","herd","hero","hold","holy","hood","horn","host","hour","howl",
  "hull","hung","hurl","hurt","hymn","inch","iron","isle","jail","jazz","jury","kelp","kept",
  "knob","knot","lack","laid","lamp","lash","lawn","laze","leak","lens","less","lick","like","limb",
  "limp","lion","loaf","loan","loft","look","lord","loss","loud","lump",
  "lurk","lust","maid","male","malt","mane","meal","mean","meat","mild","milk","moss","moth","myth",
  "nail","navy","neat","neck","need","noon","norm","null","oath","obey","once","onto","orca","oval","over",
  "owns","park","pawn","peel","pier","pill","pink","pint","plat","plea","plow",
  "ploy","plum","poem","poet","pond","poor","pork","pour","prey","prop","pull","pulp","pump",
  "quay","rack","ramp","rang","rear","rein","rely","rift","riot","roam","roar","ruin","sang","sank","sash",
  "scar","seep","shed","shin","shot","shut","sigh","silt","sink","sire","slab","slam","slap","sled","slew",
  "slim","slip","slit","slug","smog","soak","soar","sock","soil","sole","soot","span","spar","spec","sped",
  "spun","spur","stab","stag","stew","stir","stud","sway","swim","tack","tact","tale","tall","tang","tarp",
  "tart","tear","than","that","them","then","they","thin","this","thou","tick","tied","till","tilt","toad",
  "toll","tomb","toss","tram","trap","tray","trek","trio","trod","trot","tuft","tuna","twin","undo","upon",
  "urge","vain","vary","veal","veil","vent","verb","very","vest","vial","visa","wail","wand","wasp","watt",
  "weed","weep","were","what","when","whim","whom","wick","wife","wilt","wimp","wink","with","womb",
  "wool","worm","worn","wren","yawn","year",
  // additional 4-letter
  "ally","also","amid","avid","bald","bane","bask","bind","blot","blur","boil","boon","bore","bout",
  "brag","bred","brew","brim","bulk","bury","calf","cart","chap","clad","clan","claw","clot","coax",
  "colt","cone","cope","cord","cram","cult","curb","damp","dart","daub","dean","debt","deny","dewy",
  "doom","dorm","dour","doze","drab","drip","dusk","dwell","earl","etch","faint","fern","fiat","fief",
  "flaw","flux","foal","foil","font","gait","gall","gape","garb","gash","gasp","gist","glen","glue",
  "gnaw","goad","gore","gory","gout","gown","grab","gram","gray","grey","grit","grub","gush","gust",
  "hasp","haze","heed","helm","herb","hewn","hilt","hoax","hoof","hull","hymn","iota","jade","jest",
  "jilt","jinx","jolt","keen","kelp","kemp","kern","kiln","knit","lank","lark","laud","lava","lewd",
  "lilt","lisp","livid","lobe","loch","lode","loom","lout","lynx","mane","mars","mash","mast","maul",
  "meek","meld","melt","mend","mesa","mime","mink","moat","mock","molt","monk","moor","moue","murk",
  "musk","myth","nape","nave","neon","newt","nimb","nook","numb","oafs","oath","oboe","odds","ogle",
  "oink","omen","onus","opal","opus","orca","oven","oxen","pall","pare","pave","pawn","peat","pelt",
  "perm","pert","pier","pith","plod","plow","ploy","plum","poke","pomp","pore","pout","prey","prod",
  "prom","prop","prow","prude","pulp","pyre","quad","quay","ramp","rasp","raze","reed","reef","rein",
  "rend","rick","rift","rind","rite","rive","roam","roil","rook","romp","rout","rove","ruse","sack",
  "sane","sari","sash","sate","seam","seer","self","sham","shin","shod","shun","sift","sine","slag",
  "slat","slaw","slay","slob","sloe","slop","smug","snag","snit","snub","spat","sped","spew","spry",
  "spur","stag","stub","suds","sulk","swab","swan","tack","tael","tame","tang","taut","teem","teem",
  "temp","thaw","tiff","toil","tome","tong","tore","tote","tout","tram","tray","trek","trim","trod",
  "tuft","tusk","twit","vale","vane","veer","vend","vent","vest","waft","wane","warp","wart","wavy",
  "wean","weir","welt","wend","whet","whey","whir","wick","wily","wisp","wist","wits","woad","woke",
  "womb","wont","woof","writ","yank","yawn","year","yell","yelp","yore","yurt","zeal","zest",
  // === 5-LETTER WORDS (massively expanded) ===
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
  "share","shift","shine","sight","sigma","since","sixty","skill","slate","sleep","slide","small","smart",
  "smile","snack","solar","solid","solve","south","space","spark","speak","speed","spice","spike","spine",
  "split","stack","stage","stake","stand","start","state","steam","steel","steep","stock","stone","store",
  "storm","story","stove","strap","strip","study","style","sugar","super","surge","sweet","swift","swipe",
  "table","taste","theme","think","tiger","titan","token","total","touch","tower","trace","track","trade",
  "trail","train","trait","trend","trial","tribe","trick","trust","turbo","twist","ultra","union","unity",
  "upper","urban","usage","valid","value","vault","venue","vigor","viral","voice","watch","water","whale",
  "wheel","white","world","worth","yield","agent","alert","allow","apply","arise","avoid","begin","blame",
  "bless","bloom","board","boast","break","breed","bring","carry","catch","cause","chase","check","cheer",
  "chess","chose","claim","class","climb","cling","clock","color","comes","count","cover","crash","crawl",
  "crush","dance","doing","doubt","draft","drain","drawn","dress","dried","drink","drift","drops","dying",
  "eager","early","eight","elect","ember","enemy","enjoy","enter","error","essay","ethic","every","exact",
  "exile","exist","fable","faith","false","fancy","fatal","fault","feast","fence","fetch","fever","fewer",
  "fiber","fight","final","fixed","flame","flesh","flint","flood","floor","flora","fluid","flush","flyer",
  "focal","folly","forth","frame","frank","fraud","froze","fruit","fully","funny","gamma","gauge","genre",
  "ghost","given","glass","gleam","globe","gloom","glory","going","goose","grain","grasp","grass","grave",
  "great","greed","greet","grief","grind","groan","groom","gross","grove","grown","guess","guest","guild",
  "habit","harsh","heavy","hello","hence","honey","honor","horse","hotel","humor","hurry","ideal","image",
  "imply","inbox","indie","intro","issue","ivory","jewel","joint","joker","jumbo","karma","kayak","knack",
  "knife","known","label","labor","lance","large","latch","later","laugh","lease","ledge","legal","lemon",
  "lever","linen","liver","llama","lobby","lodge","lofty","loose","lotus","loved","lover","lower","loyal",
  "lucky","lunar","lunch","lunge","lyric","macro","magic","magma","major","manor","marsh","mason","mayor",
  "meant","medal","melee","melon","mercy","merit","merry","metal","meter","might","mimic","miner","minor",
  "minus","mixed","mogul","month","moose","moral","mound","mourn","mouse","mouth","multi","nerve","never",
  "newly","night","ninja","noise","notch","nurse","occur","often","olive","onset","opera","optic",
  "orbit","other","ought","outdo","owned","oxide","ozone","paint","panic","paper","paste","pause","peace",
  "pearl","penal","perch","piano","pinch","pitch","plain","plane","plate","plead","plumb","plume","plump",
  "plush","poker","polar","porch","pouch","pound","pride","prior","prism","probe","prone","proud","prove",
  "proxy","psalm","pupil","purge","queen","query","quota","ranch","ratio","react","rebel","refer","relax",
  "relic","reply","ridge","rifle","rigid","rinse","risky","rival","rocky","rogue","roman","roost","rouge",
  "rough","round","route","rover","rugby","ruler","rumor","saint","salad","salon","sauna","scare","scent",
  "scrap","sedan","seize","serum","setup","shade","shaft","shake","shall","shame","shark","sharp","shave",
  "sheer","sheet","shelf","shell","shirt","shock","shoot","shore","short","shout","shown","siege","sized",
  "skate","skull","slice","slope","smell","smoke","snail","snake","sonic","sorry","sound","spare","spear",
  "spell","spend","spoke","spoon","sport","spray","squad","squid","staff","stain","stair","stale","stall",
  "stamp","stark","stave","steal","steer","stern","stick","still","stoic","stoke","stood","stool","stork",
  "stout","stuck","stuff","stump","stung","stunt","suave","suite","sunny","swamp","swarm","swear",
  "sweat","sweep","swept","swing","swirl","swoop","sword","sworn","syrup","teach","teeth","tempo","tense",
  "terra","thank","thick","thief","thing","third","thorn","those","three","threw","throw","thumb","tidal",
  "tight","timer","title","toast","today","topic","torch","tough","towel","toxic","tread","treat",
  "tried","troop","truck","truly","trunk","truth","tulip","tuner","tunic","uncle","under","unite","until",
  "upset","usual","utter","valor","valve","vapor","vegan","verge","verse","villa","vinyl","viola",
  "virus","visit","vista","vital","vivid","vocal","vodka","vogue","voter","vowel","wages","wagon",
  "waste","weary","weave","wedge","wheat","where","which","while","whirl","whose","wider",
  "widow","woman","women","worse","worst","wound","wrath","write","wrong","wrote","yacht","yearn","young",
  "youth","zebra",
  // additional 5-letter
  "abyss","acorn","adapt","adept","admit","adopt","adult","agile","agree","aisle","album","align","alley",
  "alpha","alter","amber","ample","angel","angle","anime","annex","antic","anvil","apart","arena","argue",
  "armor","aroma","aside","asset","attic","avian","award","bacon","badge","badly","bagel","baker","baron",
  "basic","basin","basis","batch","beach","beard","beast","bench","berry","bible","birch","black","blade",
  "bland","blank","blast","blaze","bleed","blend","blind","blink","bliss","blitz","bloat","block","blond",
  "blood","bluff","blunt","blurt","bonus","booth","bound","brace","braid","brass","brave","bravo","bread",
  "brick","bride","brief","broad","brook","brown","brunt","brush","buddy","buggy","bulge","bunch","burst",
  "cabin","cable","camel","candy","cargo","cedar","chair","chalk","champ","chaos","charm","chart","cheek",
  "choir","chunk","cider","cigar","cinch","civic","civil","clamp","clash","clasp","clear","clerk","cliff",
  "clone","cloth","clown","comet","comic","comma","coral","couch","cough","could","court","covet","crack",
  "crane","crave","craze","crazy","creek","creep","crest","crisp","cross","crude","cruel","cubic","curry",
  "curse","curve","cyber","decal","decay","decoy","decor","delay","dense","depot","depth","derby","devil",
  "diary","digit","ditch","dizzy","dodge","donor","dough","dowry","dream","dried","drool","drone","dryer",
  "dwarf","eager","easel","elbow","elder","enact","ended","endow","equip","erect","erupt","evade","exact",
  "exert","extra","fairy","feast","fetch","field","fiery","fifth","fifty","filth","flair","flake","flank",
  "flare","flock","flood","flour","foggy","force","forty","frail","frank","fresh","frost","froze","frugal",
  "gauge","ghost","given","glare","glass","gleam","glide","globe","gloss","glove","gouge","graft","grain",
  "grasp","grass","grate","graze","grief","gripe","groan","grope","gross","grove","growl","grown","gruel",
  "gruff","grunt","gummy","guppy","gusty","handy","hardy","hasty","haven","hazel","hefty","hence","haste",
  "hatch","haunt","haven","heady","heave","hedge","hefty","heron","hitch","hoard","hobby","holly","homer",
  "horde","hover","humid","humor","hurry","icing","ideal","idyll","image","index","inept","inert","inner",
  "ivory","jaunt","jelly","jewel","jolly","joust","juice","juicy","jumbo","junco","jumpy","knack","knead",
  "kneel","knelt","knoll","laden","lance","lapse","latch","leafy","leaky","lever","light","lilac","limbo",
  "liner","lingo","liver","llama","lobby","lodge","lousy","lucid","lynch","manor","maple","marsh","mayor",
  "mealy","media","mercy","merge","merry","midst","mimic","minor","mirth","miser","mixed","mocha","model",
  "mogul","molar","money","moose","morph","mossy","mound","mourn","muddy","mulch","mural","murky","mushy",
  "naive","nanny","nasal","nerdy","niece","ninety","noble","notch","nudge","oasis","omega","onset","opera",
  "otter","outer","outgo","oxide","ozone","padre","panel","panda","panic","paper","parch","paste","patch",
  "patio","pause","peach","pedal","penny","perch","perky","petal","petty","phase","photo","piano","picky",
  "pigmy","pious","pivot","pizza","plank","plead","pleat","plumb","plump","plush","poach","poker","pound",
  "prank","prawn","press","prick","print","privy","probe","prone","proof","prowl","prude","prune","psych",
  "pudgy","quail","qualm","quark","quart","quasi","query","quest","quick","quiet","quilt","quirk","quota",
  "rabbi","rally","raven","rebel","recap","reign","relax","remit","repay","repel","resin","retch","ridge",
  "ripen","risen","ritzy","rival","rivet","robin","rocky","rogue","roomy","rouge","rough","round","rowdy",
  "royal","rugby","ruler","rusty","sabot","saint","salad","salon","salsa","salty","salve","sandy","sapid",
  "sassy","sauna","savor","scald","scalp","scant","scare","scarf","scary","scene","scoff","scold","scone",
  "scoop","scope","scorn","scout","scowl","scrub","sedan","seize","sense","serve","sever","shade","shady",
  "shaft","shake","shall","shame","shape","share","shawl","shear","sheen","sheer","shelf","shell","shift",
  "shirk","shirt","shock","shore","short","shove","shrub","siege","sieve","sight","silky","silly","since",
  "siren","sixth","sixty","skeptic","skill","skimp","skirt","skull","slang","slash","sleek","sleep","slide",
  "slimy","sling","slink","slope","sloth","smack","smell","smelt","smirk","smith","smoky","snare","sneak",
  "sneer","snore","snort","sober","soggy","solar","solid","solve","sonic","sorry","sound","south","space",
  "spade","spare","spawn","spear","speck","spiel","spill","spine","spite","spoke","spoof","spook","spool",
  "spore","sport","spout","spray","spree","sprig","sprout","squad","squat","squid","stab","stack","staff",
  "stage","stain","stair","stake","stale","stalk","stall","stamp","stand","stank","stare","stark","start",
  "stash","state","stave","stays","steak","steal","steam","steel","steep","steer","stern","stiff","still",
  "sting","stink","stint","stock","stomp","stone","stool","stoop","store","storm","story","stout","strap",
  "straw","stray","strip","strum","strut","stuck","stuff","stump","stung","stunk","stunt","sugar","suite",
  "sulky","sunny","super","surge","sushi","swamp","swank","swarm","swear","sweep","swell","swept","swift",
  "swine","swipe","swirl","swoop","swore","sworn","syrup","tabby","taffy","talon","tangy","tango","taunt",
  "tease","tempo","tenet","tenor","terse","theta","thick","thigh","thine","thing","think","third","thorn",
  "three","threw","throw","thrum","thump","tiger","tight","timber","toast","token","topaz","torch","total",
  "touch","tough","towel","tower","toxic","trace","track","tract","trail","trait","tramp","trash","trawl",
  "tread","treed","trend","triad","trial","tribe","trick","tried","trill","tripe","trite","troll","troop",
  "troth","trout","truce","truck","truly","trump","trunk","truss","trust","truth","tulip","tumor","tuner",
  "turbo","tutor","twang","tweed","twerp","twice","twill","twine","twist","udder","ulcer","ultra","umbra",
  "uncle","under","undid","undue","unify","union","unite","unity","untie","upper","urban","usher","usual",
  "utter","uvula","valet","valor","valve","vapor","vault","vaunt","vegan","venue","verge","verse","vigor",
  "villa","viola","viper","vivid","visor","vista","vital","vocal","vodka","vogue","voila","volts","voter",
  "vouch","vowel","vulva","wacky","wafer","wager","wagon","waist","waste","watch","water","weary","weave",
  "wedge","weedy","weigh","weird","wheat","whack","whale","wharf","wheat","wheel","where","which","while",
  "whine","whisk","white","whole","whose","widen","width","wield","winch","windy","witch","woman","women",
  "woods","wordy","world","worry","worse","worst","worth","would","wound","wrack","wrath","wreak","wreck",
  "wrest","wring","wrong","wrote","yacht","yearn","yeast","yield","young","youth","zebra","zesty","zilch",
  // === 6-LETTER WORDS (massively expanded) ===
  "action","anchor","beyond","bridge","bright","bundle","canvas","center","choice","circle","clinic",
  "crypto","custom","decode","delete","design","direct","domain","double","enable","energy","engine",
  "expert","falcon","filter","finder","flight","global","golden","growth","health","impact","import",
  "inside","invest","launch","leader","legend","market","master","matrix","method","mobile","modern",
  "motion","native","nature","online","option","output","palace","pocket","portal","profit",
  "public","purple","record","remote","report","result","rocket","sample","search","secure",
  "select","signal","silver","simple","single","social","source","sphere","sprint","square","status",
  "stream","street","string","strike","strong","studio","summit","supply","switch","system","target",
  "thread","ticket","timber","toggle","travel","triple","unique","unlock","update","vision",
  "wonder","access","create","expand","gather","handle","ignite",
  "observe","adjust","affirm","agenda","appeal","arrive","assign","assume","assure","attach",
  "attain","attend","barrel","battle","beacon","beauty","behalf","belong","betray","bishop","blanch",
  "bonfire","border","bother","bounce","bounty","breeze","bridle","browse","bruise","bubble","buckle",
  "budget","buffet","bureau","burrow","bushel","bypass","cactus","camera","candle","cannon","canopy",
  "canyon","carbon","carpet","carrot","castle","casual","caught","cement","census","chapel","cheese",
  "cherry","classy","clever","closet","cobalt","cobble","coffee","column","combat","comedy","commit",
  "comply","convey","cookie","copper","corner","cosmic","cotton","couple","cougar","cousin","cradle",
  "create","credit","crisis","cruise","curfew","dagger","damage","dampen","dazzle","debris","decade",
  "decent","defect","defend","define","degree","demand","demise","denial","deploy","deputy","derive",
  "desert","design","desire","detail","detect","devour","dialog","digest","dinner","diplom","direct",
  "disarm","divide","donate","donkey","double","dragon","drench","driver","duplex","during","dynamo",
  "eaglet","earthy","easily","edible","effect","effort","embark","emblem","emerge","empire","employ",
  "enable","encase","encode","encore","endure","engage","enough","enrich","ensign","entire","entity",
  "envelop","equity","errand","escape","estate","evolve","exceed","excite","excuse","exempt","exhale",
  "expect","expert","export","expose","extend","extent","fabric","famine","famous","faucet","feisty",
  "feline","fellow","fennel","ferret","fierce","fiesta","figure","filter","finale","fiscal","fitful",
  "flawed","flavor","flinch","flight","flower","fluent","foliage","follow","forbid","forest","forget",
  "formal","format","fossil","foster","frenzy","frisky","frozen","frugal","future","gadget","galaxy",
  "gallon","gambit","gaming","garage","garden","garlic","garnet","gazebo","gender","genius","gentle",
  "geyser","giggle","ginger","girdle","glance","global","glossy","gobble","goggle","golden","govern",
  "gravel","groove","grumpy","guitar","gutter","guzzle","hamper","handle","harbor","hardly","harness",
  "hassle","hazard","header","hearth","heaven","hectic","hermit","heroic","hidden","hinder","hobbit",
  "hollow","homage","honest","hopper","horror","hostel","hotdog","humble","humane","hunger","hustle",
  "hybrid","icecap","immune","impair","impose","income","indoor","infant","influx","inform","inject",
  "inland","insect","insert","insist","intact","intend","intern","invent","island","jargon","jersey",
  "jigsaw","jockey","jogger","jovial","juggle","jumble","jungle","junior","justice","kaftan","karate",
  "keeper","kernel","kettle","kidney","kindle","kitten","knight","lagoon","lambda","lament","lander",
  "laptop","lavish","layout","legacy","length","lessen","lesson","letter","liable","linear","linger",
  "liquid","listen","lively","living","lizard","locker","locket","loggia","longed","looter","luster",
  "luxury","magnet","maiden","manner","mantle","marble","margin","marine","marvel","mature","meadow",
  "medium","melody","memoir","memory","mental","mentor","merger","method","metric","middle","mighty",
  "mingle","minute","mirror","misery","mishap","mobile","modest","modify","module","moment","monkey",
  "morals","mortar","mosaic","motion","motive","muscle","museum","muster","muzzle","myself","mystic",
  "narrow","nation","needle","neural","nickel","nimble","noodle","normal","notary","notice","notion",
  "nozzle","number","nutmeg","object","obtain","occupy","offend","office","offset","online","opener",
  "oppose","oracle","orange","orchid","origin","outfit","outlaw","output","overdo","oxygen","oyster",
  "paddle","palace","pallet","pamper","pantry","parade","parcel","parish","parrot","parsley","pastor",
  "patent","patrol","patron","patter","pebble","pencil","pepper","permit","person","phrase","pickle",
  "pillar","pillow","pirate","plague","planet","plaque","plasma","pledge","plenty","pliers","plunge",
  "poetry","poison","policy","polish","polite","ponder","poplar","portal","poster","potato","potion",
  "potter","poultry","powder","praise","prayer","prefab","prefer","preset","presto","prince","prison",
  "profit","proper","propel","proven","public","puddle","pumice","pummel","punish","puppet","pursue",
  "puzzle","python","quarry","quartz","quench","quirky","rabble","racket","radish","random","ranger",
  "ransom","raptor","rascal","rattle","ravage","reborn","recall","recent","recipe","reckon","recoil",
  "record","redeem","reduce","reform","refuge","refuse","regard","regime","region","regret","rehash",
  "reject","relate","relief","relish","reluct","remind","render","rental","repair","repeal","repeat",
  "repent","rescue","reside","resign","resist","resort","result","resume","retail","retain","retire",
  "retort","return","reveal","review","revolt","reward","rhythm","ribbon","riffle","ripple","rising",
  "ritual","robust","rodent","rotary","rubble","rumble","runway","rustic","saddle","safari","saliva",
  "salmon","sample","sandal","savage","savant","scenic","scheme","school","script","scroll","season",
  "second","secret","sector","seldom","senior","sensor","series","sermon","server","settle","severe",
  "shadow","shelve","shield","shimmy","shrine","shrink","shroud","sierra","simple","simmer","singer",
  "sketch","skewer","sloppy","sludge","sneeze","sniper","socket","soften","soothe","sought","source",
  "spider","spirit","splash","sponge","spooky","spread","sprout","squash","stable","stanza","staple",
  "starve","statue","steady","stereo","stitch","strain","strand","strata","streak","stride","stroke",
  "strove","studio","submit","subtle","subway","suffer","sunset","superb","supply","surely","survey",
  "suture","swivel","symbol","syntax","syrupy","system","tablet","tackle","tactic","tailor","talent",
  "tangle","target","tariff","temple","tenant","tender","tennis","tensor","terror","thesis","thirst",
  "thrive","throne","throng","thrust","thwart","ticked","tinder","tissue","toggle","tongue","trophy",
  "trough","truant","trudge","tumble","tundra","tunnel","turban","turmoil","turtle","tuxedo","twelve",
  "unfair","unfold","united","unlock","unpack","unrest","unveil","upbeat","uphold","upturn","urchin",
  "urgent","useful","utmost","utopia","vacant","valley","vanish","vanity","vapour","vendor","veneer",
  "venom","verbal","verify","vessel","viable","victim","Viking","violet","virtue","vision","visual",
  "vivify","volume","voyage","vulgar","waffle","walnut","walrus","wander","wanted","warble","warden",
  "warmth","wealth","weapon","weekly","weight","wicker","widget","window","winner","winter","wisdom",
  "wizard","wonder","worker","worthy","wraith","wreath","zenith","zigzag","zodiac",
  // === 7+ LETTER WORDS (expanded) ===
  "control","execute","explore","measure","monitor","navigate","operate","optimize","perform",
  "predict","process","produce","protect","provide","publish","purchase","qualify","recover","reduce",
  "refine","refresh","release","render","repair","replace","request","require","rescue","resolve",
  "respond","restore","retain","reveal","review","reward","satisfy","schedule","simplify","support",
  "sustain","transfer","transform","trigger","upgrade","upload","verify","connect","deliver","discover",
  "evolve","generate","account","archive","asset","atlas","audio","badge","balance","banner",
  "barrier","basket","benefit","blanket","blend","block","bonus","bottle","branch","broker",
  "buffer","burden","button","capital","capsule","cargo","central","chamber",
  "champion","channel","chapter","charge","charter","clarity","climate","cluster","collect",
  "combine","comfort","command","commerce","compare","compass","complete","concept","confirm",
  "console","contact","content","context","convert","counter","courage",
  "crisis","crown","crystal","culture","current","curve","danger","define","demand",
  "dental","deposit","detail","device","diamond","digital","display","divide","dragon",
  "dream","economy","element","engine","enough","entire","escape",
  "exceed","exchange","exhibit","express","extend","factor",
  "family","fashion","feature","finance","finger","finish","fiscal","flower",
  "forest","format","fortune","fossil","frame","freedom","freight","frozen","future",
  "gallery","genius","gentle","glacier","globe","golden","govern","gravity",
  "ground","guitar","habitat","harbor","harvest","hazard","height","helmet","hidden","honor","horizon",
  "humble","hunter","hybrid","immune","income","indoor","infant","inner","instant","intent",
  "island","jacket","journal","journey","jungle","junior","justice","kernel",
  "kingdom","knight","ladder","landed","laptop","layer","league","legacy","leisure",
  "lesson","letter","liberty","limit","liquid","lively","luxury","machine",
  "magnet","manner","manual","margin","marine","marvel","matter","meadow","medium",
  "memory","mental","mentor","metric","middle","mighty","million","mineral","mirror","mission",
  "modest","module","moment","motive","mountain","museum","mutual","mystery","narrow","nation",
  "needle","neutral","normal","notion","number","object","obtain","office","oracle","organic",
  "origin","oxygen","package","parent","patent","pattern","payout","people","permit",
  "person","phrase","pioneer","planet","platform","player","pledge","pocket","poetry","policy",
  "portion","poster","potent","powder","prayer","prefix","premium","primal","prince","prison",
  "private","program","promise","prompt","proper","protein","proven","puzzle","python","radius","random",
  "ranger","rattle","reason","record","reform","refuge","region","relief","remote","rental",
  "reserve","resort","result","retail","return","revenue","ribbon","rifle","river",
  "rubber","runner","sacred","safety","sample","savage","scenic","scheme","school","science",
  "screen","script","season","second","secret","sector","senior","sensor","series","server",
  "service","session","settle","shadow","shield","signal","silver","simple","single","sketch","social",
  "socket","source","spider","spirit","splash","stable","steady","storm","story","street","strike",
  "string","studio","submit","summit","supply","surface","surge","surplus","survey","switch","symbol",
  "tablet","talent","temple","tender","tensor","terrain","throne","ticket","timber","tissue","title",
  "toggle","tongue","topic","tower","trail","trait","tribal","trophy","tunnel","twelve","united","unity",
  "urgent","useful","valley","vapor","vector","vendor","venture","verify","vessel","viable","vigor",
  "virtue","visual","vital","vocal","volume","voyage","wallet","wealth","weapon","weekly","weight",
  "window","winter","wisdom","worker","worthy",
  // === 8+ LETTER WORDS (expanded) ===
  "absolute","abstract","academic","accepted","accuracy","achieved","activate","actually","addition",
  "adequate","adjacent","adjusted","advanced","advocate","affinity","affluent","agencies","aggregate",
  "agnostic","alliance","allocate","allowing","although","altitude","aluminum","ambiance","ambition",
  "analysis","ancestry","announce","annually","anything","anywhere","apparent","appetite","applause",
  "approach","approval","artifact","assemble","assembly","assuming","asterisk","athletic","attached",
  "attorney","audience","backbone","backward","bacteria","balanced","bankrupt","baseline","bathroom",
  "becoming","beginner","behavior","believable","belonged","benchtop","benjamin","beverage","birthday",
  "bitterly","blackout","boarding","boldness","bookcase","bookmark","borrowed","botanist","boundary",
  "bracelet","branches","breaking","breeding","bringing","broadway","brochure","browsers","browsing",
  "building","bulletin","business","calendar","campaign","capacity","cardinal","carnival","carrying",
  "casualty","catalogs","catalyst","catching","category","catering","cautious","cellular","ceremony",
  "chairman","chambers","champion","changing","chapters","charging","checking","checkout","cheerful",
  "chemical","children","choosing","circular","civilian","claiming","classify","cleanser","clearing",
  "climbing","clinical","clothing","coaching","coasting","cocktail","coherent","collapse","colonial",
  "colorful","combined","comeback","comedian","commerce","commuter","compared","compiler","complain",
  "complete","compound","computer","conceive","conclude","concrete","condense","conflict","congress",
  "conjunct","conquest","consider","consists","conspire","constant","consumer","contains","contempt",
  "contends","contents","continue","contract","contrast","controls","converge","convince","cookbook",
  "coolness","corridor","coverage","coworker","crafting","creating","creation","creative","credible",
  "criminal","criteria","critical","crossing","crunching","crushing","cultural","currency","customer",
  "cylinder","database","daughter","deadline","december","decimate","decision","decisive","declared",
  "declined","decrease","dedicate","defeated","defender","definite","delicate","delivery","demanded",
  "democrat","demolish","denounce","departed","depicted","deposits","describe","designer","despised",
  "destined","detailed","detained","detected","develope","devotion","dialogue","dictated","dictator",
  "diligent","diminish","dinosaur","diplomat","directed","director","disabled","disagree","disaster",
  "disclose","discount","discover","discrete","disorder","dispatch","disperse","displace","disposal",
  "disposed","dissolve","distance","distinct","district","dividend","doctrine","document","domestic",
  "dominant","download","downtown","dramatic","dreadful","dropping","dualisms","dumbbell","duration",
  "dwelling","dynamics","earnings","economic","educated","educator","eighteen","election","electric",
  "electron","elegance","elevator","eligible","eloquent","embedded","embodies","emerging","emission",
  "emoticon","emotions","emphasis","employed","employee","employer","emulated","enabling","enclosed",
  "encoding","endpoint","engaging","engineer","enormous","enrolled","ensuring","entering","entirely",
  "entitled","entrance","envelope","equipped","erection","escalate","escaping","espresso","essential",
  "estimate","evaluate","eventual","everyone","everyday","evidence","evolving","examined","examiner",
  "exceeded","exchange","exciting","executed","exercise","exertion","existing","expanded","expected",
  "expedite","expedited","expended","expenses","explicit","explored","explorer","exported","exporter",
  "exposure","extended","external","extracts","extremes","eyebrows","fabulous","facebook","facility",
  "familiar","families","favorite","featured","features","feedback","feelings","feminine","festival",
  "figuring","filename","filmfare","filtered","finalist","finalize","finally","finances","findings",
  "finished","flagship","flexible","floating","flourish","followed","follower","football","footwear",
  "forecast","foremost","forensic","formerly","formally","formula","fourteen","fraction","fragment",
  "frampton","francois","franklin","freaking","freeload","frequent","friendly","frontier","frontman",
  "fruitful","fruition","fuelling","fullback","fulltime","function","galactic","gameplay","garments",
  "gathered","generate","generous","genetics","genocide","geometry","gertrude","glossary","gorgeous",
  "governor","graceful","gradient","graduate","graphics","grateful","gripping","grooming","grounded",
  "grouping","guidance","guideline","habitual","hallmark","handbook","handheld","handling","handsome",
  "happened","hardware","harmless","harmonic","hashtags","headline","headlong","headsets","healthly",
  "hearings","heartily","heavenly","heritage","highland","highrise","historic","homework","honestly",
  "honeybee","honorary","horizons","hospital","hostname","hotwired","hounding","housecat","hugeness",
  "humanity","hundreds","huntsman","hydrogen","hygienist","identify","identity","ideology","ignition",
  "illusion","imperial","implicit","importar","imported","imposing","imposter","improved","impulse",
  "inactive","incident","included","incoming","increase","incurred","indicate","indirect","industry",
  "infinite","inflamed","informal","informed","infrared","inherent","inherits","injuries","innocent",
  "innovate","inspired","instance","interest","interior","internal","intimate","intrepid","intrigue",
  "invasion","invented","investor","involved","isolated","jamboree","japanese","jonathan","judgment",
  "junction","keyboard","kickback","kindness","kingdoms","knockout","knocking","labeling","landmark",
  "language","launched","launcher","lavender","layering","learning","lecturing","leftover","leverage",
  "licensed","lifetime","lightest","lighting","likewise","limiters","limiting","linkedin","listener",
  "literary","literate","location","lodestar","lodgings","logician","lonesome","longtime","lopsided",
  "lottery","machines","magazine","magnetic","maintain","majority","makeover","manifest","mantissa",
  "manually","marathon","markdown","marketed","marketer","marriage","material","maximize","mechanic",
  "medicine","medieval","meetings","membrane","memorial","merchant","metadata","midnight","military",
  "millions","minimize","minister","minority","mismatch","missions","mobility","moderate","momentum",
  "monitors","monopoly","mortgage","motivate","mountain","movement","multiple","multiply","mundane",
  "mutually","nascence","national","navigate","neighbor","networks","nightcap","nominate","nonsense",
  "notebook","notified","November","numerous","nutrient","obedient","objected","obtained","occasion",
  "occupied","occurred","offering","official","offshore","operator","opponent","opposite","optimism",
  "optional","ordering","ordinary","organism","organize","oriented","original","outlined","outreach",
  "overcome","overflow","overhead","overlook","overlord","overrule","overseas","overtake","overtime",
  "overturn","overview","painting","pandemic","panorama","paradigm","parallel","paranoid","particle",
  "passport","password","patience","peaceful","peasants","peculiar","pedantic","pendulum","pentagon",
  "perceive","periodic","personal","persuade","petition","pharmacy","pheasant","physical","pilaster",
  "pilgrims","pinpoint","pipeline","platform","pleasant","pleasure","plethora","plotting","plumbers",
  "plunging","pointing","policing","polished","politely","politics","polluted","populace","populate",
  "portions","portrait","position","positive","possible","postpone","potatoes","potently","powerful",
  "practice","precious","predator","presence","preserve","preschool","pressing","pressure","prestige",
  "presumed","pretense","prettier","prevents","previous","priestly","princess","printing","priority",
  "prisoner","pristine","probable","probably","problems","proceeds","produced","producer","produces",
  "products","profound","programs","progress","projects","prolific","promised","promptly","properly",
  "property","proposal","prospect","prospero","protocol","provider","province","provoking","prudence",
  "publicly","purchase","pursuant","pursuing","puzzling","quadrant","quantity","quarters","question",
  "railroad","randomly","readable","reaction","reaffirm","realised","realized","received","receiver",
  "recently","receptor","reckless","recovery","recruits","redirect","referral","referrer","refugees",
  "register","regulate","rehearse","reinvent","relation","relative","released","relevant","reliable",
  "religion","reluctant","remained","remember","reminded","remotely","renowned","repeated","reporter",
  "republic","research","resident","resigned","resource","response","restless","restored","restrict",
  "resulted","retailer","retained","retirees","retrieve","returned","revealed","reversal","revision",
  "revolved","rhetoric","rigorous","romantic","rotation","sabotage","sandwich","sanction","scenario",
  "schedule","scholars","scissors","scorched","seasonal","seconded","sections","security","selected",
  "semester","sentence","separate","sequence","sergeant","settlers","severely","shepherd","shipment",
  "shipping","shortage","shortest","shoulder","showdown","showcase","shutdown","sidewalk","signaled",
  "silently","singular","situated","skeleton","skillful","slightly","slowdown","smallest","snapshot",
  "snowfall","socalled","software","solution","somebody","somewhat","southern","spacious","speaking",
  "specific","specimen","spectral","spectrum","sporting","spotless","sprawled","squander","squeezed",
  "staffing","stagnant","stairway","standard","standing","standout","starling","starting","steadily",
  "steering","stimulus","stockade","stopping","straight","stranger","strategy","strength","stressed",
  "strictly","stronger","strongly","struggle","stunning","subgroup","subjects","submerse","suburban",
  "succeeds","suddenly","sufferer","sufficed","suggests","suitable","summoned","sunshine","superior",
  "supplied","supplier","supports","supposed","suppress","surround","survival","survivor","suspects",
  "suspense","symbolic","sympathy","symptoms","syndrome","synopsis","systemic","takeaway","tangible",
  "teaching","teammate","teamwork","taxonomy","teenager","telegram","televise","template","temporal",
  "tendency","terminal","terminus","terrific","tertiary","textbook","thankful","thirteen","thorough",
  "thoughts","thousand","thriller","together","tolerant","tomorrow","touching","topology","tortured",
  "totaling","tracking","traction","training","transfer","transact","transmit","traveled","treasure",
  "treating","treatise","triangle","trillion","tropical","truthful","tutorial","twilight","ultimate",
  "umbrella","uncommon","undercut","underdog","underway","unfairly","unlikely","unlocked","universe",
  "unplayed","unpopular","unstable","unveiled","upcoming","updating","upgraded","upheaval","uppercut",
  "upstream","usefully","utilized","vacation","validate","valuable","variable","variance","vastness",
  "ventures","verbally","vertical","vicinity","victoire","violence","virtuoso","visually","vivacity",
  "volatile","volcanic","voracious","waitress","walkover","wandered","warranty","weakness","welcomed",
  "whatever","whenever","wherever","wildlife","windmill","wireless","withdraw","withheld","withhold",
  "wondered","woodland","workshop","worrying","worsened","yourself",
  "adventure","algorithm","animation","apartment","appliance","arbitrary","architect","assertion",
  "attention","authority","authorize","automatic","awareness","backtrack","bandwidth","beautiful",
  "benchmark","blueprint","brilliant","broadcast","calculate","candidate","celebrate","challenge",
  "character","chemistry","childhood","chocolate","chronicle","cigarette","circulate","civilized",
  "clipboard","coalition","cognitive","colleague","collector","commander","committee","community",
  "companion","comparison","competent","complaint","component","composite","computing","concerned",
  "concludes","condition","conducive","conductor","confident","configure","confirmed","confront",
  "connected","conscious","consensus","conserved","considers","construct","consulate","consuming",
  "container","continent","continual","continued","contorted","contracts","contrasts","contribute",
  "controls","convenient","converged","convinced","cooperate","copyright","corrected","corporate",
  "corridors","corrupted","cosmetics","courtyard","crackdown","craftsman","credential","cultivate",
  "currently","customers","customary","customize","dangerous","dashboard","dealmaker","deception",
  "declining","dedicated","defendant","defensive","deficient","delivered","demanding","democracy",
  "departure","dependent","depending","depicting","deposited","depressed","derailing","described",
  "designers","designing","desperate","destroyed","detective","determine","developed","developer",
  "deviation","diagnosed","diagnosis","dictation","diligence","dimension","directing","direction",
  "directive","directory","disappear","discharge","disclosed","discovery","discredit","discussed",
  "discovery","dismissal","displayed","displaced","disputing","disrupted","dissolves","distances",
  "distorted","disturbed","divergent","diversity","divisions","dominated","dramatize","dwindling",
  "dynamical","ecosystem","education","effective","efficient","elaborate","electoral","elevation",
  "eliminate","elsewhere","embarking","embracing","emergency","emotional","employees","empowered",
  "encounter","encourage","encrypted","endurance","energetic","engineer","enjoyable","enjoyment",
  "enlighten","enormous","ensembles","entertain","enthusiast","enumerate","epileptic","equipment",
  "essential","establish","estimated","evaluated","everybody","evolution","examiners","examining",
  "excellent","exception","excessive","exchanged","exclusive","executive","exemption","exhausted",
  "exhibited","existence","expansion","expecting","expedient","expensive","expertise","explained",
  "explosion","exploring","expressly","extension","extensive","extracted","extravag","extremely",
  "eyewitness","fabricate","fascinate","favorable","featuring","fertility","fictional","financial",
  "fireplace","flagstaff","flashback","fledgling","floodgate","flowering","flowchart","fluctuate",
  "footprint","forefront","foreigner","foresight","forestall","formalize","formatted","formulate",
  "fortnight","framework","franchise","fraternit","frequency","freshness","frostbite","frustrate",
  "fulfilled","functions","furniture","gentleman","genuinely","geographi","governing","gratitude",
  "graveyard","guarantee","guidebook","guideline","gymnasium","happiness","harbinger","hardcover",
  "harmonize","heartbeat","heartfelt","heirloom","helpfully","hepatitis","herbalist","highlight",
  "histogram","historian","hopefully","horseback","horseplay","horseshoe","hospitals","hostility",
  "household","humankind","hurricane","hyperbole","identical","imaginary","immediate","immensely",
  "immigrant","implement","important","impressed","improving","inaugural","incentive","incidence",
  "including","inclusion","inclusive","incorrect","increment","incumbent","indicates","indicator",
  "indignant","indignity","indirectly","indistinct","industrial","influence","informant","inherited",
  "initially","injection","innkeeper","innocence","innovator","inserting","inspector","instantly",
  "institute","insurable","insurance","integrity","intellect","intending","intensity","intention",
  "intercept","interface","interfere","interlude","interpret","interrupt","intervene","interview",
  "introduce","intuition","intuitive","invention","investing","invisible","involuted","irrational",
  "irrigated","ironsides","isolation","itinerary","jailbreak","jumpstart","justified","keystroke",
  "kidnappers","kilometer","kingsland","labyrinth","landscape","languages","launching","lazybones",
  "legendary","legislate","leisurely","licensing","lifestyle","lightning","limestone","limelight",
  "linearity","literally","literally","livestock","longevity","lowercase","machinery","machinist",
  "magnitude","majordomo","makeshift","malicious","mandatory","manifesto","manifesto","marketing",
  "marvelous","mastering","matchless","materials","mathematic","mechanics","mechanism","mediation",
  "megabytes","mentioned","mentoring","merchants","messaging","metabolic","metaphors","migratory",
  "milestone","miniature","miscreant","misgiving","misguided","misplaced","modifying","molecular",
  "momentary","monastery","moonlight","mortuaries","motivated","multiples","multicast","multiplex",
  "municipal","mythology","narrative","naturally","necessary","negotiate","nightfall","nightmare",
  "nominally","nonprofit","northeast","northwest","nostalgia","notations","nutrients","nutrition",
  "obscurity","obstacles","obtaining","occupying","offending","offensive","operating","operation",
  "operative","opponents","opportune","opponents","orchestra","organizer","orientate","originals",
  "otherwise","outbreaks","outermost","outfitter","outgrowth","outlining","outnumber","outskirts",
  "outwardly","ovenproof","overboard","overhauls","overlying","overnight","overrides","oversized",
  "overthrow","overwhelm","packaging","pageantry","painfully","Pakistani","paleocrat","pamphlets",
  "panicking","paramount","paratroop","partially","partition","perfectly","permanent","permitted",
  "persevere","personage","personnel","pertinent","phenotype","phenomena","phosphate","phrasings",
  "pictorial","pineapple","pioneered","placement","plaintive","playfully","pleasures","plethoras",
  "plugboard","plurality","poignancy","policeman","political","pollution","populated","pornsmith",
  "portfolio","positions","possessed","postcards","posterior","posturing","potential","powerless",
  "practical","pragmatic","praiseful","preceding","precision","predictor","predispos","predominant",
  "preferred","prejudice","premature","prescribe","presented","presenter","preserved","president",
  "pressured","presently","pretended","prevalent","prevented","primarily","primitive","principal",
  "principle","printable","privilege","proactive","probation","proceeded","processor","procuring",
  "producing","professed","profiling","profiteer","profusely","programme","projected","prolonged",
  "prominent","promising","promoting","promotion","promptest","proofread","propagate","propelled",
  "proposals","proposing","propriety","prosecute","prospects","proactive","protected","protested",
  "protocols","providing","provision","provoking","proximate","prudently","psychical","publicize",
  "published","publisher","publicist","punctuate","purposely","quadratic","qualifier","quarterly",
  "quotation","radiantly","rampaging","ranchette","rationale","reasoning","rebellion","receiving",
  "reception","recession","recognize","recommend","reconcile","recovered","recruited","recurring",
  "recycling","redundant","reference","reflected","reflexive","regarding","registers","registrar",
  "regulator","rehearsal","reinforce","reiterate","rejecting","relations","releasing","relevance",
  "relentless","reluctant","remainder","remaining","remarking","remediate","reminding","renewable",
  "rendering","renovated","replicate","reporting","represent","reproduce","republics","reputable",
  "requiring","resembled","reserving","residence","resilient","resistant","resolving","resonance",
  "resorting","resources","responded","restoring","restraint","resulting","retention","retrieval",
  "returning","revealing","revolving","rewarding","righteous","righthand","riverside","rolodexes",
  "roundtable","safeguard","sanctuary","satellite","satisfied","saxophone","sceptical","scholarly",
  "schooling","scientist","screaming","screening","scripture","searching","secretary","selection",
  "selectors","semantics","semblance","sensation","sensitive","sentiment","separator","september",
  "seriously","seventeen","shattered","sheltered","shipboard","shopfront","shoulders","sidelined",
  "signaling","signature","simulated","situation","skeptical","slightest","slippages","snowflake",
  "something","somewhere","sophomore","southeast","southwest","sparingly","specially","specified",
  "spectacle","spiritual","splitting","sponsored","spotlight","springbok","squashing","squidward",
  "stability","stampeded","standards","statement","stationed","steadfast","steamboat","sterilize",
  "stimulate","stipulate","stockpile","stopwatch","strategic","streaming","streetcar","stretched",
  "strictest","strikeovers","stringent","structure","struggled","subjected","submitted","subscribe",
  "substance","succeeded","suffering","suggested","summarize","summaries","sunscreen","supervise",
  "supplying","supported","supporter","suppressed","surrogate","suspected","suspended","sustained",
  "sweetness","switching","symbolize","symmetric","syndicate","synthesis","synthetic","talkative",
  "targeting","technique","telegraph","telephone","telescope","temporary","tenacious","terminate",
  "territory","terrorism","threshold","thumbnail","timetable","tolerance","trademark","tradition",
  "trainings","transcend","translate","transport","treasured","treatment","trembling","triggered",
  "troubling","trumpeted","turbulent","tutorials","typically","ultimatum","umbrella","unanimous",
  "uncertain","undermine","undertake","undisclosed","unfolding","uniformed","universal","unlocking",
  "unlimited","unmindful","unpopular","upholding","urbanized","utilizing","utterance","vacancies",
  "valuation","variation","vegetable","velodrome","versatile","vibration","violation","virtually",
  "visionary","visualize","volunteer","wandering","warehouse","warranted","waterfall","watermark",
  "weighting","welcoming","wellbeing","wholesale","windswept","wondering","wonderful","wordsmith",
  "workforce","workplace","workshops","worldwide","worsening",
  // Latin-origin & brandable
  "opus","apex","nexus","axis","crux","flux","lux","pax","rex","vox",
  "praxis","thesis","genesis","aura","circa","coda","ethos","modus",
  "aegis","atlas","helix","onyx","zenith","cipher","sigil","logos","aqua","nova","terra","vita",
  "fiat","lex","lumen","nexus","prima","ultra","verso","acme","niche","forte","cadre","motif",
  // Industry compounds
  "consulting","advisory","associates","partners","ventures","holdings","enterprises",
  "strategic","management","marketing","advertising","branding","creative",
  "agency","collective","logistics","procurement",
  "blockchain","automation","analytics","algorithm","computing","cybersecurity",
  "encryption","interface","networking","processor","protocol","robotics",
  "semiconductor","simulation","streaming","synthetic","workflow",
  "diagnostics","laboratory","neurology","nutrition","oncology","orthopedic",
  "pathology","psychiatry","rehabilitation","surgical","telehealth","therapeutic",
  "veterinary","vitamin","supplement","meditation","mindfulness",
  "accounting","arbitrage","auditing","brokerage","commodity","compliance",
  "derivative","portfolio","refinance","securities","settlement","treasury",
  "underwriting","valuation","volatility",
]);

// Offensive words — instant reject
const OFFENSIVE = new Set([
  "porn","xxx","sex","fuck","shit","dick","cock","bitch","slut","whore","twat","cunt",
  "nude","naked","kill","murder","hate","racist","spam","scam","fraud","viagra","cialis",
  "poo","poop","crap","damn","ass","butt","fart","puke","vomit","barf",
]);

// ─── TRADEMARK / BRAND BLOCKLIST (instant reject or heavy penalty) ───
const TRADEMARK_BRANDS_REJECT = new Set([
  // Standardized exams & certifications (heavily protected)
  "toefl","ielts","gmat","gre","lsat","mcat","toeic",
  "cissp","comptia","ccna","ccnp","ccie","itil","pmp",
  // Big tech brands
  "google","apple","microsoft","amazon","facebook","instagram","tiktok","snapchat",
  "youtube","twitter","netflix","spotify","uber","lyft","airbnb","tesla","nvidia",
  "openai","chatgpt","midjourney","anthropic","claude",
  "adobe","oracle","cisco","samsung","huawei","xiaomi",
  // Major brands
  "nike","adidas","puma","gucci","prada","chanel","hermes","rolex","cartier",
  "coca","pepsi","mcdonalds","starbucks","walmart","costco",
  "disney","marvel","pixar","warner","sony","nintendo","playstation","xbox",
  "ferrari","porsche","lamborghini","maserati","bentley","bugatti",
  "visa","mastercard","amex","paypal","stripe","venmo","coinbase","binance",
  // Pharma
  "pfizer","moderna","astrazeneca","novartis","roche","merck","bayer",
  // Protected orgs
  "olympic","grammy","oscar","emmy","fifa","nfl","nba","mlb","nhl","uefa",
  "harvard","stanford","oxford","cambridge","yale","mit","princeton",
]);

// Substrings that trigger heavy penalty (not rejection) when embedded in longer domains
const TRADEMARK_SUBSTRINGS = [
  "google","amazon","facebook","instagram","tiktok","youtube","netflix",
  "spotify","uber","tesla","nvidia","openai","chatgpt","disney","marvel",
  "toefl","ielts","gmat","coinbase","binance","paypal",
  "ferrari","porsche","rolex","gucci","chanel","prada",
  "microsoft","adobe","oracle","cisco","samsung",
];

// ─── NICHE LIQUIDITY SCORES (1-10, higher = more buyers = easier resale) ───
const NICHE_LIQUIDITY: Record<string, number> = {
  ai_tech: 9, saas: 9, fintech: 8, ecommerce: 8,
  health: 7, gaming: 7, real_estate: 7,
  security: 6, jobs: 6, automotive: 6,
  biotech: 5, insurance: 5, legal: 5, energy: 5, travel: 5, beauty: 5,
  education: 4, pet: 4, space: 3,
};

// Negative brand words — penalty
const NEGATIVE_BRAND_WORDS = new Set([
  "lost","lose","dead","death","die","dying","kill","grave","tomb","ghost","doom","curse",
  "decay","rot","ruin","fail","broke","broken","crash","error","bug","fault","flaw","void",
  "null","empty","blank","pain","hurt","sick","ill","disease","toxic","poison","burn","bleed",
  "wound","scar","cry","tear","grief","sad","misery","agony","cheap","poor","weak","slow",
  "dull","dark","grim","bleak","cold","harsh","bitter","sour","stale","flat","limp","lazy",
  "boring","bland","plain","basic","generic","average","mediocre","fear","scare","dread",
  "panic","risk","threat","danger","hazard","trap","cage","bind","stuck","war","fight",
  "clash","conflict","enemy","rival","battle","struggle","chaos","mess","wreck",
]);

// Filler words — signal a phrase, not a brand
const FILLER_WORDS = new Set([
  "the","this","that","these","those","for","with","from","into","over","under","about",
  "between","through","and","but","nor","yet","is","am","are","was","were","been","being",
  "have","has","had","does","did","can","could","will","would","shall","should","may","might",
  "just","please","not","very","too","also","really","here","there",
]);

// Negative connotation sound patterns
const NEGATIVE_SOUNDS = [/gr[auo]n/i, /ugh/i, /blech|bleh/i, /sn[aoi]r/i, /scr[aue]/i, /squ[eai]/i, /cr[auo][nwk]/i];

// ═══════════════════════════════════════════════════════════════
// ─── DP-BASED DICTIONARY COVERAGE ENGINE ─────────────────────
// ═══════════════════════════════════════════════════════════════

function isKnownWord(word: string): boolean {
  return DICTIONARY.has(word) || HIGH_VALUE_KEYWORDS.has(word);
}

function dictionaryCoverage(sld: string): { words: string[]; coverage: number } {
  const lower = sld.toLowerCase();
  const n = lower.length;
  if (n === 0) return { words: [], coverage: 0 };
  if (n <= 3) {
    if (isKnownWord(lower)) return { words: [lower], coverage: 1.0 };
    return { words: [], coverage: 0 };
  }

  const dp = new Array(n + 1).fill(0);
  const parent: (null | { start: number; wordLen: number })[] = new Array(n + 1).fill(null);

  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    parent[i] = null;
    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = lower.substring(start, i);
      if (isKnownWord(candidate)) {
        const cov = dp[start] + len;
        if (cov > dp[i]) {
          dp[i] = cov;
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
      words.push(lower.substring(p.start, p.start + p.wordLen));
      pos = p.start;
    } else {
      pos--;
    }
  }
  words.reverse();

  let coveredChars = dp[n];

  // Portmanteau boost
  if (coveredChars < n) {
    for (let i = 2; i < n - 1; i++) {
      for (let overlap = 1; overlap <= Math.min(4, i, n - i); overlap++) {
        const left = lower.substring(0, i + overlap);
        const right = lower.substring(i);
        if (isKnownWord(left) && isKnownWord(right)) {
          coveredChars = n;
          if (words.length === 0) words.push(left, right);
        }
      }
    }
  }

  return { words, coverage: n > 0 ? coveredChars / n : 0 };
}

// ═══════════════════════════════════════════════════════════════
// ─── SYLLABLE COUNTING ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function wordSyllables(word: string): number {
  if (word.length <= 2) return 1;
  let extra = 0;
  let w = word;
  const suffixes = [
    { s: "tion", n: 1 }, { s: "sion", n: 1 }, { s: "ious", n: 2 }, { s: "eous", n: 2 },
    { s: "able", n: 2 }, { s: "ible", n: 2 }, { s: "ness", n: 1 }, { s: "ment", n: 1 },
    { s: "ing", n: 1 }, { s: "ful", n: 1 }, { s: "less", n: 1 }, { s: "ize", n: 1 },
    { s: "ous", n: 1 }, { s: "ive", n: 1 }, { s: "ly", n: 1 }, { s: "er", n: 1 },
  ];
  for (const { s, n } of suffixes) {
    if (w.endsWith(s) && w.length > s.length + 1) { extra += n; w = w.slice(0, -s.length); break; }
  }
  if (!extra && w.endsWith("ed") && w.length > 3) {
    const ch = w[w.length - 3];
    if (ch === "t" || ch === "d") extra += 1;
    w = w.slice(0, -2);
  }
  let count = 0, prevVowel = false;
  for (const ch of w) {
    const isV = "aeiouy".includes(ch);
    if (isV && !prevVowel) count++;
    prevVowel = isV;
  }
  if (w.length > 2 && w.endsWith("e") && !"aeiouy".includes(w[w.length - 2]) && count > 1) count--;
  return Math.max(1, count + extra);
}

function countSyllables(name: string): number {
  const { words } = dictionaryCoverage(name);
  if (words.length === 0) return wordSyllables(name);
  let total = 0;
  for (const w of words) total += wordSyllables(w);
  return Math.max(1, total);
}

// ═══════════════════════════════════════════════════════════════
// ─── CVCVC PATTERN DETECTOR ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function isCVCVC(sld: string): boolean {
  if (sld.length < 4 || sld.length > 7) return false;
  const pattern = [...sld].map(c => VOWELS.has(c) ? 'V' : 'C').join('');
  const brandablePatterns = ['CVCVC', 'VCVCV', 'CVCV', 'VCVC', 'CVCCV', 'CVCVCV', 'VCVCVC'];
  return brandablePatterns.includes(pattern);
}

// ═══════════════════════════════════════════════════════════════
// ─── COMPREHENSIVE HEURISTIC QUALITY SCORER ──────────────────
// ═══════════════════════════════════════════════════════════════

interface HeuristicResult {
  score: number;
  category: string;
  summary: string;
  estimated_value: number;
  brandability: number;
  keyword_strength: number;
  length_score: number;
}

function fullHeuristicScore(
  sld: string,
  comparableKeywords?: Set<string>,
  dbTrendingKeywords?: Record<string, number>,
  kwVolumeCache?: Map<string, number>,
): HeuristicResult | null {
  const lower = sld.toLowerCase();
  const len = lower.length;
  let score = 0;

  // ─── INSTANT REJECT ───
  for (const word of OFFENSIVE) {
    if (lower.includes(word)) return null;
  }
  if (TRADEMARK_BRANDS_REJECT.has(lower)) return null;
  for (const tm of TRADEMARK_SUBSTRINGS) {
    if (lower.includes(tm) && lower !== tm) return null;
  }
  if (BAD_CLUSTERS.test(lower)) return null;
  const vowelCount = [...lower].filter(c => VOWELS.has(c)).length;
  if (vowelCount === 0 && len > 2) return null;
  const vowelRatio = vowelCount / len;
  if (vowelRatio < 0.15 && len > 3) return null;
  if (len > 15) return null;
  if (lower.includes("-")) return null;
  if (/\d+x\d+/i.test(lower)) return null;
  if (/^\d/.test(lower)) return null;

  const { words, coverage } = dictionaryCoverage(lower);
  if (words.length >= 4) return null;

  const realWords = words.filter(w => DICTIONARY.has(w));
  const realCoverage = realWords.reduce((s, w) => s + w.length, 0) / Math.max(len, 1);

  let brandabilityRaw = 0;
  let keywordStrengthRaw = 0;
  let lengthScoreRaw = 0;
  let detectedCategory = "generic";
  let matchedNiche = "";

  score += Math.round(coverage * 25);

  if (len <= 3) { score += 15; lengthScoreRaw = 95; }
  else if (len === 4) { score += 15; lengthScoreRaw = 92; }
  else if (len === 5) { score += 14; lengthScoreRaw = 85; }
  else if (len === 6) { score += 12; lengthScoreRaw = 75; }
  else if (len <= 8) { score += 10; lengthScoreRaw = 60; }
  else if (len <= 10) { score += 6; lengthScoreRaw = 40; }
  else if (len <= 12) { score += 3; lengthScoreRaw = 25; }
  else { lengthScoreRaw = 10; }

  const isSingleRealWord = realWords.length === 1 && realCoverage >= 0.95;
  if (isSingleRealWord) {
    if (len <= 3) { score += 30; brandabilityRaw += 90; }
    else if (len === 4) { score += 25; brandabilityRaw += 85; }
    else if (len === 5) { score += 22; brandabilityRaw += 80; }
    else if (len === 6) { score += 18; brandabilityRaw += 70; }
    else if (len <= 8) { score += 12; brandabilityRaw += 55; }
    else { score += 8; brandabilityRaw += 40; }
    detectedCategory = len <= 4 ? "short" : "premium";
  } else if (words.length === 1 && coverage >= 0.95 && !DICTIONARY.has(lower)) {
    if (len <= 4) { score += 8; brandabilityRaw += 40; }
    else if (len <= 6) { score += 5; brandabilityRaw += 30; }
    else { score += 2; brandabilityRaw += 15; }
  }

  if (words.length === 2 && coverage >= 0.85) {
    const bothRealDict = realWords.length === 2 && realWords.every(w => w.length >= 3);
    const totalLen = words.reduce((s, w) => s + w.length, 0);
    if (bothRealDict) {
      const hasTrending = words.some(w => TRENDING_KEYWORDS[w] && TRENDING_KEYWORDS[w] >= 1.3);
      if (totalLen <= 8) { score += hasTrending ? 18 : 15; brandabilityRaw += 70; }
      else if (totalLen <= 10) { score += hasTrending ? 15 : 13; brandabilityRaw += 60; }
      else if (totalLen <= 12) { score += hasTrending ? 10 : 8; brandabilityRaw += 45; }
      else if (totalLen <= 14) { score += 5; brandabilityRaw += 30; }
      detectedCategory = "compound";
    } else if (words.some(w => DICTIONARY.has(w) && w.length >= 3)) {
      if (totalLen <= 8) { score += 6; brandabilityRaw += 35; }
      else if (totalLen <= 10) { score += 4; brandabilityRaw += 25; }
      else { score += 2; brandabilityRaw += 15; }
      detectedCategory = "compound";
    }
  }

  if (isCVCVC(lower) && !isSingleRealWord) {
    const syl = wordSyllables(lower);
    if (len <= 5 && syl <= 2) { score += 10; brandabilityRaw += 50; detectedCategory = "brandable"; }
    else if (len === 6 && syl <= 2) { score += 7; brandabilityRaw += 40; detectedCategory = "brandable"; }
    else if (len <= 7 && syl <= 3) { score += 4; brandabilityRaw += 25; }
  }

  const exactTrendHeat = TRENDING_KEYWORDS[lower];
  if (exactTrendHeat) {
    const isRealOrShort = DICTIONARY.has(lower) || len <= 3;
    if (exactTrendHeat >= 2.0) { score += isRealOrShort ? 20 : 14; keywordStrengthRaw += 90; }
    else if (exactTrendHeat >= 1.7) { score += isRealOrShort ? 16 : 10; keywordStrengthRaw += 75; }
    else if (exactTrendHeat >= 1.4) { score += isRealOrShort ? 12 : 7; keywordStrengthRaw += 60; }
    else { score += isRealOrShort ? 8 : 4; keywordStrengthRaw += 40; }
    detectedCategory = "keyword";
  }

  if (words.length === 2 && !exactTrendHeat && len <= 12) {
    const trendingWords = words.filter(w => TRENDING_KEYWORDS[w] && TRENDING_KEYWORDS[w] >= 1.3);
    const hasDictWord = words.some(w => DICTIONARY.has(w) && w.length >= 3 && !TRENDING_KEYWORDS[w]);
    if (trendingWords.length >= 2 && realWords.length >= 1) { score += 18; keywordStrengthRaw += 85; detectedCategory = "keyword"; }
    else if (trendingWords.length === 1 && hasDictWord && realWords.length >= 1) {
      const bestTrendHeat = Math.max(...trendingWords.map(w => TRENDING_KEYWORDS[w] || 0));
      score += bestTrendHeat >= 2.0 ? 14 : bestTrendHeat >= 1.7 ? 12 : 10;
      keywordStrengthRaw += 70;
      detectedCategory = "keyword";
    }
    else if (trendingWords.length === 1 && realWords.length >= 1) { score += 5; keywordStrengthRaw += 40; }
    else if (trendingWords.length >= 1) { score += 2; keywordStrengthRaw += 20; }
  }

  if (!exactTrendHeat) {
    let bestHeat = 0;
    for (const word of words) { const heat = TRENDING_KEYWORDS[word]; if (heat && heat > bestHeat) bestHeat = heat; }
    for (const [kw, heat] of Object.entries(TRENDING_KEYWORDS)) { if (kw.length <= 3 && lower.includes(kw) && heat > bestHeat) bestHeat = heat; }
    let trendBonus = 0;
    if (bestHeat >= 2.0) trendBonus = 12;
    else if (bestHeat >= 1.7) trendBonus = 9;
    else if (bestHeat >= 1.5) trendBonus = 7;
    else if (bestHeat >= 1.3) trendBonus = 4;
    else if (bestHeat >= 1.1) trendBonus = 2;
    if (words.length >= 3) trendBonus = Math.min(trendBonus, 4);
    score += trendBonus;
    if (bestHeat > 1.3) keywordStrengthRaw += Math.min(30, Math.round(bestHeat * 15));
  }

  if (dbTrendingKeywords && Object.keys(dbTrendingKeywords).length > 0) {
    let bestDbHeat = 0;
    const fullHeat = dbTrendingKeywords[lower];
    if (fullHeat && fullHeat > bestDbHeat) bestDbHeat = fullHeat;
    for (const word of words) { const heat = dbTrendingKeywords[word]; if (heat && heat > bestDbHeat) bestDbHeat = heat; }
    for (const [kw, heat] of Object.entries(dbTrendingKeywords)) { if (kw.length >= 3 && kw.length <= 6 && lower.includes(kw) && heat > bestDbHeat) bestDbHeat = heat; }
    let dbBonus = 0;
    if (bestDbHeat >= 2.0) dbBonus = 10;
    else if (bestDbHeat >= 1.5) dbBonus = 7;
    else if (bestDbHeat >= 1.2) dbBonus = 4;
    else if (bestDbHeat >= 1.0) dbBonus = 2;
    if (words.length >= 3) dbBonus = Math.min(dbBonus, 3);
    score += dbBonus;
    if (bestDbHeat > 1.2) keywordStrengthRaw += Math.min(20, Math.round(bestDbHeat * 10));
  }

  let bestNicheHeat = 0;
  for (const [nicheName, niche] of Object.entries(NICHE_CATEGORIES)) {
    const matchCount = words.filter(w => niche.keywords.includes(w)).length;
    if (matchCount > 0) {
      if (niche.heat > bestNicheHeat) { bestNicheHeat = niche.heat; matchedNiche = nicheName; }
      if (matchCount >= 2) bestNicheHeat = Math.min(100, bestNicheHeat + 10);
    }
  }
  let nicheBonus = 0;
  if (bestNicheHeat >= 85) nicheBonus = 10;
  else if (bestNicheHeat >= 70) nicheBonus = 7;
  else if (bestNicheHeat >= 55) nicheBonus = 4;
  else if (bestNicheHeat >= 40) nicheBonus = 2;
  if (words.length >= 3) nicheBonus = Math.min(nicheBonus, 3);
  score += nicheBonus;
  if (matchedNiche && detectedCategory === "generic") detectedCategory = "niche";

  let brandableBonus = 0;
  if (realCoverage >= 0.4 || len <= 6) {
    for (const pat of BRANDABLE_SUFFIXES) { if (pat.test(lower)) { brandableBonus += 5; break; } }
    for (const pat of BRANDABLE_PREFIXES) { if (pat.test(lower)) { brandableBonus += 3; break; } }
  }
  if (len >= 4 && len <= 7) {
    let alternations = 0;
    for (let i = 1; i < len; i++) { if (VOWELS.has(lower[i - 1]) !== VOWELS.has(lower[i])) alternations++; }
    if (alternations / (len - 1) >= 0.7) brandableBonus += 2;
  }
  const cappedBrandable = Math.min(8, brandableBonus);
  score += cappedBrandable;
  brandabilityRaw += cappedBrandable * 5;

  let goodBi = 0, totalBi = 0;
  for (let i = 0; i < lower.length - 1; i++) { totalBi++; if (GOOD_BIGRAMS.has(lower.slice(i, i + 2))) goodBi++; }
  const bigramScore = totalBi > 0 ? Math.round((goodBi / totalBi) * 8) : 0;
  score += bigramScore;
  brandabilityRaw += bigramScore * 3;

  if (vowelRatio >= 0.25 && vowelRatio <= 0.55) score += 8;
  else if (vowelRatio >= 0.2 && vowelRatio <= 0.6) score += 5;
  else if (vowelRatio >= 0.15) score += 2;

  const syllables = countSyllables(lower);
  if (syllables >= 2 && syllables <= 3) score += 6;
  else if (syllables === 1 && len >= 3) score += 5;
  else if (syllables === 4) score += 2;

  if (words.length >= 1) {
    const fillerCount = words.filter(w => FILLER_WORDS.has(w)).length;
    const negCount = words.filter(w => NEGATIVE_BRAND_WORDS.has(w)).length;
    if (fillerCount === 0 && negCount === 0) { if (words.length <= 2 && realWords.length >= 1) score += 5; }
    else if (fillerCount >= 1) score -= 10;
    if (negCount >= 1) score -= 10;
    if (words.length === 3) score -= 25;
  }

  if (realWords.length === 0 && len >= 5) score -= 20;
  else if (realWords.length === 0 && len >= 4) score -= 10;
  if (realCoverage < 0.3 && len >= 8) score -= 15;
  if (realCoverage < 0.5 && len >= 12) score -= 10;

  if (comparableKeywords && comparableKeywords.size > 0) {
    let compMatch = 0;
    for (const word of words) { if (word.length >= 3 && comparableKeywords.has(word)) compMatch++; }
    if (compMatch >= 2 && words.length <= 2 && len <= 12) { score += 12; keywordStrengthRaw += 20; }
    else if (compMatch >= 1 && words.length <= 2 && len <= 10) { score += 8; keywordStrengthRaw += 15; }
    else if (compMatch >= 1 && words.length <= 2) { score += 5; keywordStrengthRaw += 10; }
    else if (compMatch >= 1) { score += 2; keywordStrengthRaw += 5; }
  }

  if (kwVolumeCache && kwVolumeCache.size > 0) {
    let bestVolume = 0;
    const fullVol = kwVolumeCache.get(lower);
    if (fullVol && fullVol > bestVolume) bestVolume = fullVol;
    for (const word of words) { if (word.length >= 3) { const vol = kwVolumeCache.get(word); if (vol && vol > bestVolume) bestVolume = vol; } }
    let volBonus = 0;
    if (bestVolume >= 10000) volBonus = 12;
    else if (bestVolume >= 5000) volBonus = 10;
    else if (bestVolume >= 1000) volBonus = 7;
    else if (bestVolume >= 500) volBonus = 4;
    else if (bestVolume >= 100) volBonus = 2;
    if (words.length >= 3) volBonus = Math.min(volBonus, 4);
    score += volBonus;
    keywordStrengthRaw += volBonus * 3;
  }

  if (len >= 13) score -= 15;
  else if (len >= 11) score -= 8;

  if (/(.)\1{2,}/.test(lower)) score -= 10;
  for (const pat of NEGATIVE_SOUNDS) { if (pat.test(lower)) { score -= 5; break; } }
  if (/\d/.test(lower)) score -= 15;
  if (/^[a-z]{1,2}$/i.test(lower)) score -= 20;

  if (realWords.length === 0 && score >= 50) score -= 25;
  else if (realWords.length === 0 && score >= 30) score -= 15;
  if (realCoverage < 0.4 && score >= 55 && len >= 6) score -= 12;

  for (const w of words) { if (TRADEMARK_BRANDS_REJECT.has(w)) { score -= 40; break; } }

  let bestLiquidity = 5;
  for (const [niche, config] of Object.entries(NICHE_CATEGORIES)) {
    const matchCount = words.filter(w => config.keywords.includes(w)).length;
    if (matchCount > 0) { const liq = NICHE_LIQUIDITY[niche] || 5; if (matchedNiche === "" || liq > bestLiquidity) { bestLiquidity = liq; matchedNiche = niche; } }
  }
  if (bestLiquidity >= 8) score += 8;
  else if (bestLiquidity >= 7) score += 5;
  else if (bestLiquidity >= 6) score += 2;
  else if (bestLiquidity <= 3) score -= 8;
  else if (bestLiquidity <= 4) score -= 4;

  let finalScore = Math.max(0, Math.min(100, score));

  // Guardrail: prevent trend-keyword inflation on weak/gibberish strings
  const weakLexicalQuality = realWords.length === 0 || realCoverage < 0.45;
  const lowStructureQuality = words.length >= 3 || (len >= 11 && realCoverage < 0.6);

  if (weakLexicalQuality && !isCVCVC(lower)) {
    finalScore = Math.min(finalScore, 74);
    keywordStrengthRaw = Math.min(keywordStrengthRaw, 55);
    brandabilityRaw = Math.min(brandabilityRaw, 60);
  }

  if (lowStructureQuality) {
    finalScore = Math.min(finalScore, 68);
  }

  if (len <= 4 && isSingleRealWord) detectedCategory = "short";
  else if (isSingleRealWord && finalScore >= 70) detectedCategory = "premium";
  else if (weakLexicalQuality && finalScore < 70 && detectedCategory !== "short" && detectedCategory !== "premium") detectedCategory = "weak";

  // ─── REALISTIC FLIP-VALUE ESTIMATION ───
  // Pending delete domains are reg-fee acquisitions. Values reflect
  // realistic wholesale/flip prices, NOT fantasy end-user appraisals.
  // Tiers: Junk $0-20 | Low $20-150 | Decent $150-1000 | Strong $1k-5k | Premium $5k-15k (rare)
  let estimatedValue = 0;
  if (finalScore >= 95) {
    // Premium tier — only single real dictionary words or exceptional compounds
    estimatedValue = isSingleRealWord
      ? 5000 + (finalScore - 95) * 1500   // $5k–$12.5k for real words
      : 2500 + (finalScore - 95) * 500;   // $2.5k–$5k for compounds
  } else if (finalScore >= 85) {
    estimatedValue = isSingleRealWord
      ? 1500 + (finalScore - 85) * 350    // $1.5k–$5k
      : 800 + (finalScore - 85) * 170;    // $800–$2.5k
  } else if (finalScore >= 75) {
    estimatedValue = isSingleRealWord
      ? 500 + (finalScore - 75) * 100     // $500–$1.5k
      : 250 + (finalScore - 75) * 55;     // $250–$800
  } else if (finalScore >= 65) {
    estimatedValue = 100 + (finalScore - 65) * 15;  // $100–$250
  } else if (finalScore >= 55) {
    estimatedValue = 30 + (finalScore - 55) * 7;    // $30–$100
  } else {
    estimatedValue = Math.max(0, finalScore);         // $0–$55
  }

  // Liquidity adjustment (modest — not a 1.3x inflator)
  if (bestLiquidity >= 8) estimatedValue = Math.round(estimatedValue * 1.15);
  else if (bestLiquidity >= 7) estimatedValue = Math.round(estimatedValue * 1.08);
  else if (bestLiquidity <= 3) estimatedValue = Math.round(estimatedValue * 0.5);
  else if (bestLiquidity <= 4) estimatedValue = Math.round(estimatedValue * 0.7);

  // Spam suffix penalty — "xyz", "hub", "app", "tool" compounds get capped
  const SPAM_SUFFIXES = ["xyz","hub","app","tool","bot","zone","spot","pro","now","go","io","hq","ly"];
  const lastWord = words.length > 0 ? words[words.length - 1] : "";
  if (SPAM_SUFFIXES.includes(lastWord) && words.length >= 2) {
    estimatedValue = Math.min(estimatedValue, 300);
  }

  // Hard ceiling: pending-delete compound domains rarely exceed $5k flip value
  if (!isSingleRealWord && words.length >= 2) {
    estimatedValue = Math.min(estimatedValue, 5000);
  }

  const summaryParts: string[] = [];
  if (isSingleRealWord) summaryParts.push(`Real word "${realWords[0]}"`);
  else if (words.length === 2 && realWords.length === 2) summaryParts.push(`Clean compound: ${words.join("+")}`);
  else if (words.length === 2) summaryParts.push(`Two-part: ${words.join("+")}`);
  else if (detectedCategory === "brandable") summaryParts.push("Brandable coined name");
  else summaryParts.push(`${len}-char domain`);

  if (matchedNiche) summaryParts.push(matchedNiche.replace(/_/g, " "));
  if (finalScore >= 75) summaryParts.push("strong potential");
  else if (finalScore >= 60) summaryParts.push("decent potential");

  return {
    score: finalScore,
    category: detectedCategory,
    summary: summaryParts.join(", ").slice(0, 100),
    estimated_value: estimatedValue,
    brandability: Math.min(100, Math.max(0, brandabilityRaw)),
    keyword_strength: Math.min(100, Math.max(0, keywordStrengthRaw)),
    length_score: Math.min(100, Math.max(0, lengthScoreRaw)),
  };
}

// ═══════════════════════════════════════════════════════════════
// ─── COMPARABLE SALES KEYWORD EXTRACTION ─────────────────────
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch keywords from comparable_sales that sold for $500+
 * These keywords are proven valuable in the aftermarket.
 */
async function loadComparableKeywords(adminClient: any): Promise<Set<string>> {
  try {
    const { data, error } = await adminClient
      .from("comparable_sales")
      .select("domain_name")
      .gte("sale_price", 500)
      .limit(5000);

    if (error || !data) return new Set();

    const keywords = new Set<string>();
    for (const row of data) {
      const sld = (row.domain_name || "").split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
      const { words } = dictionaryCoverage(sld);
      for (const w of words) {
        if (w.length >= 3) keywords.add(w);
      }
    }
    console.log(`Loaded ${keywords.size} comparable sale keywords from ${data.length} sales`);
    return keywords;
  } catch (e) {
    console.error("Failed to load comparable keywords:", e);
    return new Set();
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── CHAINING HELPER ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function queueNextEvaluateInvocation(supabaseUrl: string, serviceKey: string, scanId: string, context: string) {
  const selfUrl = `${supabaseUrl}/functions/v1/evaluate-drops`;

  const chainPromise = fetch(selfUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "respond-async",
    },
    body: JSON.stringify({ scanId }),
  })
    .then(async (resp) => {
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.error(`[${context}] Self-chain failed:`, resp.status, body.slice(0, 300));
      }
    })
    .catch((err) => console.error(`[${context}] Self-chain error:`, err));

  const edgeRuntime = (globalThis as unknown as {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;

  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(chainPromise);
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── MAIN HANDLER ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { scanId, csvText, csvUrl } = body;
    if (!scanId) throw new Error("Missing scanId");

    // ─── INITIAL CALL: Parse CSV, extract .com domains, store for chunked pre-screening ───
    if (csvText || csvUrl) {
      let initialCsvText = csvText as string | undefined;
      let userId: string | null = null;

      const isSharedCsv = csvUrl && csvUrl.includes("/store/daily-drops.csv");

      if (!isSharedCsv) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing authorization");

        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authErr } = await userClient.auth.getUser();
        if (authErr || !user) throw new Error("Unauthorized");
        userId = user.id;
      }

      if (!initialCsvText && csvUrl) {
        let parsedCsvUrl: URL;
        try {
          parsedCsvUrl = new URL(csvUrl);
        } catch {
          throw new Error("Invalid shared CSV URL");
        }

        if (!["http:", "https:"].includes(parsedCsvUrl.protocol)) {
          throw new Error("Shared CSV URL must use http or https");
        }

        if (!parsedCsvUrl.pathname.endsWith("/store/daily-drops.csv")) {
          throw new Error("Shared CSV URL must point to /store/daily-drops.csv");
        }

        const csvResponse = await fetch(parsedCsvUrl.toString());
        if (!csvResponse.ok) {
          throw new Error(`Failed to fetch shared CSV (${csvResponse.status})`);
        }

        initialCsvText = await csvResponse.text();
      }

      if (!initialCsvText || !initialCsvText.trim()) {
        throw new Error("CSV source is empty");
      }

      // Parse CSV — extract .com domains only
      const parseCsvLine = (line: string): string[] => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (ch === "," && !inQuotes) { values.push(current); current = ""; }
          else current += ch;
        }
        values.push(current);
        return values;
      };

      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const normalizeDropDate = (rawValue: string): string => {
        const value = rawValue.trim().replace(/^"|"$/g, "");
        if (!value) return "";
        const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) return `${isoMatch[1]}-${String(Number(isoMatch[2])).padStart(2, "0")}-${String(Number(isoMatch[3])).padStart(2, "0")}`;
        const slashIsoMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (slashIsoMatch) return `${slashIsoMatch[1]}-${String(Number(slashIsoMatch[2])).padStart(2, "0")}-${String(Number(slashIsoMatch[3])).padStart(2, "0")}`;
        const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (usMatch) return `${usMatch[3]}-${String(Number(usMatch[1])).padStart(2, "0")}-${String(Number(usMatch[2])).padStart(2, "0")}`;
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return formatLocalDate(parsed);
        return "";
      };

      const lines = initialCsvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length === 0) throw new Error("CSV source has no rows");

      const cols = parseCsvLine(lines[0]).map((c: string) => c.toLowerCase().trim().replace(/"/g, ""));
      let domainCol = cols.findIndex((c: string) =>
        c === "domain" || c === "domain name" || c === "domainname" || c === "name"
      );
      if (domainCol === -1) domainCol = 0;
      const dropDateCol = cols.findIndex((c: string) =>
        c === "drop date" || c === "dropdate" || c === "drop_date" ||
        c === "delete date" || c === "expiry date" || c === "expiration date"
      );

      const totalParsed = lines.length - 1;
      const comDomains: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]).map((c: string) => c.trim().replace(/"/g, ""));
        const domain = row[domainCol]?.toLowerCase().trim();
        if (!domain || !domain.endsWith(".com") || domain.length <= 4) continue;

        const rawDropDate = dropDateCol >= 0 ? row[dropDateCol] || "" : "";
        const dropDate = normalizeDropDate(rawDropDate);
        comDomains.push(dropDate ? `${domain}\t${dropDate}` : domain);
      }

      console.log(`Initial parse: ${totalParsed} total → ${comDomains.length} .com domains — starting chunked heuristic evaluation`);

      const csvData = "---RAW---\n" + comDomains.join("\n");

      await adminClient.from("drop_scans").update({
        total_domains: totalParsed,
        filtered_domains: 0,
        status: "pre-screening",
        csv_data: csvData,
        resume_from: 0,
      }).eq("id", scanId);

      queueNextEvaluateInvocation(supabaseUrl, serviceKey, scanId, "initial-queue");

      return new Response(JSON.stringify({
        success: true, queued: true,
        total: totalParsed, comDomains: comDomains.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHAINED INVOCATION: Heuristic evaluation ───
    const { data: scan, error: scanErr } = await adminClient
      .from("drop_scans")
      .select("csv_data, resume_from, filtered_domains, evaluated_domains, status")
      .eq("id", scanId)
      .single();

    if (scanErr || !scan) throw new Error("Scan not found");
    if (scan.status === "complete" || scan.status === "error") {
      return new Response(JSON.stringify({ success: true, already: scan.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PRE_SCREEN_CHUNK = 15000;

    // ─── HEURISTIC EVALUATION PHASE (replaces old pre-screen + AI two-phase) ───
    if (scan.status === "pre-screening") {
      const rawLines = (scan.csv_data || "").split("\n");
      const allRaw = rawLines.slice(1).filter(Boolean); // skip "---RAW---"
      const startIdx = scan.resume_from || 0;
      const endIdx = Math.min(startIdx + PRE_SCREEN_CHUNK, allRaw.length);
      const chunk = allRaw.slice(startIdx, endIdx);

      if (chunk.length === 0) {
        await adminClient.from("drop_scans").update({
          status: "complete",
          csv_data: null,
        }).eq("id", scanId);
        return new Response(JSON.stringify({ success: true, status: "complete", evaluated: scan.evaluated_domains || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load enrichment data
      const comparableKeywords = await loadComparableKeywords(adminClient);

      let dbTrendingKeywords: Record<string, number> = {};
      try {
        const { data: trendData } = await adminClient
          .from("trending_market_data")
          .select("trending_keywords")
          .eq("id", "latest")
          .maybeSingle();
        if (trendData?.trending_keywords) {
          dbTrendingKeywords = trendData.trending_keywords as Record<string, number>;
          console.log(`Loaded ${Object.keys(dbTrendingKeywords).length} DB trending keywords`);
        }
      } catch (e) {
        console.warn("Failed to load DB trending keywords:", e);
      }

      const kwVolumeCache = new Map<string, number>();
      try {
        const { data: volData } = await adminClient
          .from("keyword_volume_cache")
          .select("keyword, search_volume")
          .gt("search_volume", 0)
          .limit(1000);
        if (volData) {
          for (const row of volData) kwVolumeCache.set(row.keyword.toLowerCase(), row.search_volume);
          console.log(`Loaded ${kwVolumeCache.size} keywords from volume cache`);
        }
      } catch (e) {
        console.warn("Failed to load keyword volume cache:", e);
      }

      // Score domains and collect results directly
      const results: {
        scan_id: string; domain_name: string; ai_score: number; ai_summary: string;
        category: string; estimated_value: number; brandability: number;
        keyword_strength: number; length_score: number; drop_date: string | null;
      }[] = [];

      for (const entry of chunk) {
        const [domain, dropDate] = entry.includes("\t") ? entry.split("\t") : [entry, ""];
        const sld = domain.replace(/\.com$/, "");

        // Hard gate: reject hyphens/numbers
        if (sld.includes("-")) continue;
        if (/\d/.test(sld)) {
          if (/\d+x\d+/i.test(sld)) continue;
          if (/^\d/.test(sld)) continue;
          if ((sld.match(/\d+/g) || []).length > 1) continue;
          const cleanSld = sld.replace(/[0-9]/g, "");
          const hasHighValue = [...HIGH_VALUE_KEYWORDS].some(kw => kw.length >= 3 && cleanSld.includes(kw));
          if (!hasHighValue) continue;
          const bestKw = [...HIGH_VALUE_KEYWORDS].filter(kw => kw.length >= 3 && cleanSld.includes(kw))
            .sort((a, b) => b.length - a.length)[0];
          if (!bestKw || bestKw.length / cleanSld.length < 0.5) continue;
        }

        const result = fullHeuristicScore(sld, comparableKeywords, dbTrendingKeywords, kwVolumeCache);
        if (result && result.score >= QUALITY_THRESHOLD) {
          results.push({
            scan_id: scanId,
            domain_name: domain,
            ai_score: result.score,
            ai_summary: result.summary,
            category: result.category,
            estimated_value: result.estimated_value,
            brandability: result.brandability,
            keyword_strength: result.keyword_strength,
            length_score: result.length_score,
            drop_date: dropDate || null,
          });
        }
      }

      // Sort by score and cap total results
      results.sort((a, b) => b.ai_score - a.ai_score);

      // Insert results in batches
      const existingEvaluated = scan.evaluated_domains || 0;
      const existingFiltered = scan.filtered_domains || 0;
      const INSERT_BATCH = 200;
      let inserted = 0;

      for (let i = 0; i < results.length; i += INSERT_BATCH) {
        const batch = results.slice(i, i + INSERT_BATCH);
        const { error: insertErr } = await adminClient.from("drop_scan_results").insert(batch);
        if (insertErr) {
          console.error("Insert error:", insertErr.message);
        } else {
          inserted += batch.length;
        }
      }

      const newEvaluated = existingEvaluated + chunk.length;
      const newFiltered = existingFiltered + results.length;

      console.log(`Heuristic chunk ${startIdx}-${endIdx}/${allRaw.length}: ${chunk.length} checked → ${results.length} qualified (total filtered: ${newFiltered}, evaluated: ${newEvaluated})`);

      const nextIdx = endIdx;
      if (nextIdx >= allRaw.length) {
        // All done
        await adminClient.from("drop_scans").update({
          status: "complete",
          csv_data: null,
          filtered_domains: newFiltered,
          evaluated_domains: newEvaluated,
          resume_from: nextIdx,
        }).eq("id", scanId);

        console.log(`Scan complete: ${newEvaluated} evaluated, ${newFiltered} results stored (zero AI cost)`);

        return new Response(JSON.stringify({
          success: true, status: "complete",
          evaluated: newEvaluated, qualified: newFiltered,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // More chunks to process
        await adminClient.from("drop_scans").update({
          filtered_domains: newFiltered,
          evaluated_domains: newEvaluated,
          resume_from: nextIdx,
        }).eq("id", scanId);

        queueNextEvaluateInvocation(supabaseUrl, serviceKey, scanId, "heuristic-eval");

        return new Response(JSON.stringify({
          success: true, phase: "heuristic-eval",
          processed: nextIdx, total: allRaw.length,
          chunkQualified: results.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback for any legacy "evaluating" status scans — just mark complete
    if (scan.status === "evaluating") {
      await adminClient.from("drop_scans").update({
        status: "complete",
        csv_data: null,
      }).eq("id", scanId);
      return new Response(JSON.stringify({ success: true, status: "complete", legacy: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: scan.status }), {
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
