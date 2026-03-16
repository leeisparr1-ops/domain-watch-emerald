import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_BATCH_SIZE = 50;           // larger batches = fewer API calls
const DOMAINS_PER_INVOCATION = 200;  // process more per chain link
const QUALITY_THRESHOLD = 62;        // aggressive: only strong names reach AI
const PREMIUM_TIER_THRESHOLD = 75;   // only the best get the bigger model
const MAX_AI_QUEUE = 6000;           // cap AI evaluation to prevent runaway costs

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

// ─── COMPREHENSIVE DICTIONARY (3,000+ words from platform) ───
const DICTIONARY = new Set([
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
  "ode","pal","peg","ply","pry","pun","pup","rag","rub","rye","sag","tab","tax","urn","via","vim","woe",
  "yak","yaw","yen",
  // 4-letter
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
  "deed","deer","dial","dirt","dish","dose","down","draw","drum","dual","dust","duty","each","emit","exam",
  "exit","face","fact","fail","fair","fall","fear","feel","fill","fish","fist","flat","flaw","foam","fold",
  "folk","fool","foot","fork","fort","four","fowl","from","full","fury","fuss","gait","gale","gang","girl",
  "glad","goat","good","grab","gray","grin","gulf","gust","half","hall","hand","hang","harm","harp","haul",
  "head","heap","hear","heel","herb","herd","hero","hint","hold","holy","hood","horn","host","hour","howl",
  "hull","hung","hurl","hurt","hymn","inch","iron","isle","jail","jazz","jury","keen","kelp","kept","kind",
  "king","knob","knot","lack","laid","lamp","lash","lawn","laze","leak","lens","less","lick","like","limb",
  "limp","line","lion","list","live","load","loaf","loan","loft","lone","look","lord","loss","loud","lump",
  "lurk","lust","maid","male","malt","mane","meal","mean","meat","mild","milk","moss","moth","much","myth",
  "nail","navy","neat","neck","need","noon","norm","null","oath","obey","once","onto","orca","oval","over",
  "owns","pair","pale","pall","park","pawn","peel","pier","pill","pink","pint","plan","plat","plea","plow",
  "ploy","plum","poem","poet","poke","pond","poor","pork","pour","prey","prop","pull","pulp","pump","push",
  "quay","rack","ramp","rang","rear","rein","rely","rift","riot","roam","roar","ruin","sang","sank","sash",
  "scar","seep","shed","shin","shot","shut","sigh","silt","sink","sire","slab","slam","slap","sled","slew",
  "slim","slip","slit","slug","smog","soak","soar","sock","soil","sole","soot","span","spar","spec","sped",
  "spun","spur","stab","stag","stew","stir","stud","sway","swim","tack","tact","tale","tall","tang","tarp",
  "tart","tear","than","that","them","then","they","thin","this","thou","tick","tied","till","tilt","toad",
  "toll","tomb","toss","tram","trap","tray","trek","trio","trod","trot","tuft","tuna","twin","undo","upon",
  "urge","vain","vary","veal","veil","vent","verb","very","vest","vial","visa","wail","wand","wasp","watt",
  "weed","weep","were","what","when","whim","whom","wick","wife","wilt","wimp","wink","wise","with","womb",
  "wool","worm","worn","wren","yawn","year",
  // 5-letter
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
  "newly","night","ninja","noble","noise","notch","nurse","occur","often","olive","onset","opera","optic",
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
  "stout","strip","stuck","stuff","stump","stung","stunt","suave","suite","sunny","swamp","swarm","swear",
  "sweat","sweep","swept","swing","swirl","swoop","sword","sworn","syrup","teach","teeth","tempo","tense",
  "terra","thank","thick","thief","thing","third","thorn","those","three","threw","throw","thumb","tidal",
  "tight","timer","title","toast","today","topic","torch","tough","towel","toxic","train","tread","treat",
  "tried","troop","truck","truly","trunk","truth","tulip","tuner","tunic","uncle","under","unite","until",
  "upset","usual","utter","valor","valve","vapor","vegan","verge","verse","vigor","villa","vinyl","viola",
  "viral","virus","visit","vista","vital","vivid","vocal","vodka","vogue","voter","vowel","wages","wagon",
  "waste","water","weary","weave","wedge","wheat","wheel","where","which","while","whirl","whose","wider",
  "widow","woman","women","worse","worst","wound","wrath","write","wrong","wrote","yacht","yearn","young",
  "youth","zebra",
  // 6+ letter
  "action","anchor","beyond","bridge","bright","bundle","canvas","center","choice","circle","clinic",
  "crypto","custom","decode","delete","design","direct","domain","double","enable","energy","engine",
  "expert","falcon","filter","finder","flight","global","golden","growth","health","impact","import",
  "inside","invest","launch","leader","legend","market","master","matrix","method","mobile","modern",
  "motion","native","nature","online","option","output","palace","partner","pocket","portal","profit",
  "public","purple","ranking","record","remote","report","result","rocket","sample","search","secure",
  "select","signal","silver","simple","single","social","source","sphere","sprint","square","status",
  "stream","street","string","strike","strong","studio","summit","supply","switch","system","target",
  "thread","ticket","timber","toggle","travel","triple","unique","unlock","update","venture","vision",
  "wonder","control","access","create","execute","expand","explore","gather","handle","ignite","measure",
  "monitor","navigate","observe","operate","optimize","perform","predict","process","produce","protect",
  "provide","publish","purchase","qualify","recover","reduce","refine","refresh","release","render",
  "repair","replace","request","require","rescue","resolve","respond","restore","retain","reveal",
  "review","reward","satisfy","schedule","simplify","support","sustain","transfer","transform","trigger",
  "upgrade","upload","verify","connect","deliver","discover","evolve","generate","account","archive",
  "arena","asset","atlas","audio","badge","balance","banner","barrel","barrier","basket","beacon",
  "benefit","blanket","blend","block","board","bonus","bottle","bounce","branch","broker","budget",
  "buffer","burden","button","capital","capsule","carbon","cargo","castle","central","chamber",
  "champion","channel","chapter","charge","charter","claim","clarity","climate","cluster","collect",
  "column","combine","comfort","command","commerce","compare","compass","complete","concept","confirm",
  "console","contact","content","context","convert","copper","corner","counter","couple","courage",
  "credit","crisis","crown","crystal","culture","current","curve","danger","decade","define","demand",
  "dental","deposit","desert","detail","device","dialog","diamond","digital","display","divide","dragon",
  "dream","economy","effect","effort","element","emerge","empire","enough","entire","entity","equity",
  "escape","estate","event","exceed","exchange","exhibit","express","extend","fabric","factor","falcon",
  "family","fashion","feature","figure","finance","finger","finish","fiscal","flame","fleet","flower",
  "fluid","forest","format","fortune","forum","fossil","frame","freedom","freight","frozen","future",
  "galaxy","garden","genius","gentle","glacier","glass","globe","golden","govern","grain","gravity",
  "ground","guitar","habitat","harbor","harvest","hazard","height","helmet","hidden","honor","horizon",
  "humble","hunter","hybrid","immune","income","indoor","infant","inner","insert","instant","intent",
  "island","ivory","jacket","jewel","joint","journal","journey","jungle","junior","justice","kernel",
  "kingdom","knight","ladder","lambda","landed","laptop","layer","league","legacy","legend","leisure",
  "lesson","letter","lever","liberty","limit","linear","liquid","lively","lunar","luxury","machine",
  "magnet","maiden","manner","manual","margin","marine","marvel","matter","meadow","medal","medium",
  "memory","mental","mentor","metric","middle","mighty","million","mineral","mirror","mission","model",
  "modest","module","moment","motive","mountain","muscle","museum","mutual","mystery","narrow","nation",
  "needle","neural","neutral","normal","notion","number","object","obtain","office","oracle","organic",
  "origin","oxygen","package","palace","panel","parent","patent","pattern","payout","people","permit",
  "person","phrase","pioneer","planet","plasma","platform","player","pledge","pocket","poetry","policy",
  "portal","portion","poster","potent","powder","prayer","prefix","premium","primal","prince","prison",
  "private","program","promise","prompt","proper","protein","proven","puzzle","python","radius","random",
  "ranger","rattle","reason","rebel","record","reform","refuge","region","relief","remote","rental",
  "rescue","reserve","resort","result","retail","return","revenue","ribbon","rider","rifle","river",
  "royal","rubber","runner","sacred","safety","sample","savage","scenic","scheme","school","science",
  "scope","screen","script","season","second","secret","sector","senior","sensor","series","server",
  "service","session","settle","shadow","shield","signal","silver","simple","single","sketch","social",
  "socket","source","spider","spirit","splash","stable","steady","storm","story","street","strike",
  "string","studio","submit","summit","supply","surface","surge","surplus","survey","switch","symbol",
  "tablet","talent","temple","tender","tensor","terrain","throne","ticket","timber","tissue","title",
  "toggle","tongue","topic","tower","trail","trait","tribal","trophy","tunnel","twelve","united","unity",
  "urgent","useful","valley","vapor","vector","vendor","venture","verify","vessel","viable","vigor",
  "virtue","visual","vital","vocal","volume","voyage","wallet","wealth","weapon","weekly","weight",
  "window","winter","wisdom","worker","worthy",
  "intelligence","intelligent","adventure","analysis","animation","application","architect",
  "atmosphere","authority","automobile","beautiful","benchmark","blueprint","brilliant","broadcast",
  "calculate","candidate","champion","chocolate","community","companion","comparison","competition",
  "component","computer","conclusion","condition","conference","confidence","connection","consultant",
  "consumer","container","continent","contract","convention","corporate","credential","curriculum",
  "dangerous","dashboard","database","deadline","decision","dedicated","developer","diagnosis",
  "dimension","direction","director","disaster","discipline","discount","discovery","distance",
  "document","dominant","download","dramatic","dynamics","economic","ecosystem","education",
  "effective","efficient","electric","elephant","elevator","emergency","emotional","employee",
  "endeavor","endurance","engineer","enormous","enterprise","entrance","environment","equipment",
  "essential","establish","estimate","evidence","evolution","excellent","exception","exclusive",
  "executive","exercise","existence","expansion","expensive","experience","experiment","expertise",
  "extension","external","extreme","facility","familiar","fantastic","favorite","festival",
  "financial","flexible","football","forecast","formation","formula","foundation","framework",
  "franchise","frequency","frontier","function","furniture","generator","generous","genuine",
  "geography","gorgeous","graduate","guardian","guidance","guideline","happiness","hardware",
  "headline","healthcare","heritage","highlight","historic","hospital","household","hurricane",
  "immediate","important","impression","incident","incredible","independent","indicator","individual",
  "industry","infinite","inflation","influence","ingredient","innovation","inspiration","institute",
  "instrument","insurance","integrity","intention","interest","interior","internal","internet",
  "interview","invention","investor","invisible","landmark","landscape","language","latitude",
  "learning","leverage","lifetime","lighting","limestone","literary","location","magnetic",
  "majority","marathon","material","mechanic","medicine","midnight","military","momentum","mortgage",
  "movement","multiple","negative","neighbor","notebook","numerous","obstacle","occasion","offering",
  "official","offshore","operator","opposite","ordinary","original","outbreak","overcome","overview",
  "painting","parallel","passport","patience","peaceful","personal","perspective","pharmacy",
  "physical","pleasant","pleasure","plumbing","politics","positive","possible","potential","powerful",
  "practice","precious","presence","president","pressure","previous","princess","principal","priority",
  "producer","product","profound","progress","project","property","proposal","prospect","provider",
  "province","purchase","question","railroad","reaction","readable","receiver","recovery","referral",
  "relation","relevant","reliable","religion","remember","reminder","renowned","reporter","republic",
  "research","resident","resource","response","romantic","rotation","sandwich","scenario","schedule",
  "scientist","security","semester","sentence","separate","sequence","shepherd","shipping","shortage",
  "shoulder","sidewalk","signature","skeleton","software","solution","somebody","southern","specific",
  "spectrum","standard","standing","strategy","strength","struggle","stunning","suburban","suitable",
  "sunlight","superior","surprise","survival","survivor","symbolic","sympathy","teaching","technique",
  "teenager","telegram","template","terminal","thinking","thousand","together","tomorrow","tracking",
  "training","treasure","triangle","tropical","tutorial","ultimate","umbrella","uncommon","universe",
  "unlikely","upcoming","vacation","validate","valuable","variable","vertical","volatile","whatever",
  "wireless","workshop","yourself",
  // Latin-origin & brandable
  "opus","apex","nexus","axis","crux","flux","lux","pax","rex","vox",
  "praxis","thesis","genesis","aura","circa","coda","ethos","modus",
  "aegis","atlas","helix","onyx","zenith","cipher","sigil",
  // Industry compounds
  "consulting","advisory","associates","partners","ventures","holdings","enterprises",
  "strategic","management","marketing","advertising","branding","creative",
  "agency","workshop","collective","logistics","procurement",
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
// ─── COMPREHENSIVE HEURISTIC QUALITY SCORER ──────────────────
// ═══════════════════════════════════════════════════════════════

/**
 * Score a domain SLD 0-100 using the platform's full scoring intelligence:
 * 
 *  - Dictionary coverage (DP-based):       25 pts
 *  - Length sweet spot:                     12 pts
 *  - Trending keyword heat:                15 pts (NEW)
 *  - Niche market heat:                    10 pts (NEW)
 *  - Brandable pattern recognition:         8 pts (NEW)
 *  - Bigram quality:                        8 pts
 *  - Vowel balance:                         8 pts
 *  - Syllable rhythm:                       6 pts
 *  - Semantic coherence:                    5 pts
 *  - Comparable sales keyword match:        8 pts (applied after, via DB)
 *  
 *  Penalties: offensive (-100), negative brand words, filler words,
 *  consonant clusters, negative sounds, hyphens, numbers, repeats
 */
function quickQualityScore(sld: string, comparableKeywords?: Set<string>): number {
  const lower = sld.toLowerCase();
  const len = lower.length;
  let score = 0;

  // ─── INSTANT REJECT ───
  for (const word of OFFENSIVE) {
    if (lower.includes(word)) return 0;
  }

  // ─── 1. DICTIONARY COVERAGE (max 25 pts) ───
  const { words, coverage } = dictionaryCoverage(lower);
  score += Math.round(coverage * 25);

  // ─── 2. LENGTH SWEET SPOT (max 12 pts) ───
  if (len <= 3) score += 10;
  else if (len <= 5) score += 12;
  else if (len <= 8) score += 11;
  else if (len <= 10) score += 7;
  else if (len <= 12) score += 4;
  else if (len <= 15) score += 1;

  // ─── 3. TRENDING KEYWORD HEAT (max 15 pts) ── NEW ───
  let bestHeat = 0;
  for (const word of words) {
    const heat = TRENDING_KEYWORDS[word];
    if (heat && heat > bestHeat) bestHeat = heat;
  }
  // Also check embedded short trending keywords
  for (const [kw, heat] of Object.entries(TRENDING_KEYWORDS)) {
    if (kw.length <= 3 && lower.includes(kw) && heat > bestHeat) bestHeat = heat;
  }
  if (bestHeat >= 2.0) score += 15;
  else if (bestHeat >= 1.7) score += 12;
  else if (bestHeat >= 1.5) score += 9;
  else if (bestHeat >= 1.3) score += 6;
  else if (bestHeat >= 1.1) score += 3;

  // ─── 4. NICHE MARKET HEAT (max 10 pts) ── NEW ───
  let bestNicheHeat = 0;
  for (const [, niche] of Object.entries(NICHE_CATEGORIES)) {
    const matchCount = words.filter(w => niche.keywords.includes(w)).length;
    if (matchCount > 0) {
      bestNicheHeat = Math.max(bestNicheHeat, niche.heat);
    }
  }
  if (bestNicheHeat >= 85) score += 10;
  else if (bestNicheHeat >= 70) score += 7;
  else if (bestNicheHeat >= 55) score += 4;
  else if (bestNicheHeat >= 40) score += 2;

  // ─── 5. BRANDABLE PATTERN RECOGNITION (max 8 pts) ── NEW ───
  let brandableBonus = 0;
  
  // Brandable suffixes (Shopify, Spotify, Calendly)
  for (const pat of BRANDABLE_SUFFIXES) {
    if (pat.test(lower)) { brandableBonus += 4; break; }
  }
  
  // Brandable prefixes (unbox, reboot, promax)
  for (const pat of BRANDABLE_PREFIXES) {
    if (pat.test(lower)) { brandableBonus += 2; break; }
  }
  
  // Vowel-consonant alternation rhythm (brandable names flow well)
  let alternations = 0;
  for (let i = 1; i < Math.min(len, 10); i++) {
    const prevV = VOWELS.has(lower[i - 1]);
    const currV = VOWELS.has(lower[i]);
    if (prevV !== currV) alternations++;
  }
  const altRatio = alternations / (Math.min(len, 10) - 1);
  if (altRatio >= 0.7 && len >= 4 && len <= 8) brandableBonus += 3;
  else if (altRatio >= 0.5) brandableBonus += 1;
  
  // Short coined names that "sound like a brand" (e.g., Roku, Hulu, Zoho)
  if (len >= 4 && len <= 6 && coverage < 0.5 && altRatio >= 0.6) {
    // Sounds brandable even without dictionary words
    brandableBonus += 3;
  }
  
  score += Math.min(8, brandableBonus);

  // ─── 6. BIGRAM QUALITY (max 8 pts) ───
  let goodBi = 0, totalBi = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    totalBi++;
    if (GOOD_BIGRAMS.has(lower.slice(i, i + 2))) goodBi++;
  }
  score += totalBi > 0 ? Math.round((goodBi / totalBi) * 8) : 0;

  // ─── 7. VOWEL BALANCE (max 8 pts) ───
  const vowelCount = [...lower].filter(c => VOWELS.has(c)).length;
  const vowelRatio = vowelCount / len;
  if (vowelRatio >= 0.25 && vowelRatio <= 0.55) score += 8;
  else if (vowelRatio >= 0.2 && vowelRatio <= 0.6) score += 5;
  else if (vowelRatio >= 0.15) score += 2;

  // ─── 8. SYLLABLE RHYTHM (max 6 pts) ───
  const syllables = countSyllables(lower);
  if (syllables >= 2 && syllables <= 3) score += 6;
  else if (syllables === 1) score += 4;
  else if (syllables === 4) score += 2;

  // ─── 9. SEMANTIC COHERENCE (max 5 pts) ───
  if (words.length >= 1) {
    const fillerCount = words.filter(w => FILLER_WORDS.has(w)).length;
    const negCount = words.filter(w => NEGATIVE_BRAND_WORDS.has(w)).length;
    if (fillerCount === 0 && negCount === 0) {
      if (words.length <= 2) score += 5;
      else if (words.length === 3) score += 2;
    } else if (fillerCount >= 1) score -= 5;
    if (negCount >= 1) score -= 5;
    // 3+ word domains are almost never brandable (phrases, not brands)
    if (words.length >= 3) score -= 8;
    // 4+ word domains are sentences, not domains
    if (words.length >= 4) score -= 10;
  }

  // ─── 10. COMPARABLE SALES KEYWORD MATCH (max 8 pts) ── NEW ───
  if (comparableKeywords && comparableKeywords.size > 0) {
    let compMatch = 0;
    for (const word of words) {
      if (word.length >= 3 && comparableKeywords.has(word)) compMatch++;
    }
    if (compMatch >= 2) score += 8;
    else if (compMatch === 1) score += 5;
  }

  // ─── PENALTIES ───
  if (BAD_CLUSTERS.test(lower)) score -= 10;
  if (/(.)\1{2,}/.test(lower)) score -= 8;
  for (const pat of NEGATIVE_SOUNDS) {
    if (pat.test(lower)) { score -= 4; break; }
  }
  // Hyphens are a strong negative signal for brandability
  if (lower.includes("-")) score -= 15;
  // Numbers: dimension patterns (4x4) are worst, leading digits bad, any digit penalized
  if (/\d+x\d+/i.test(lower)) score -= 25;
  else if (/^\d/.test(lower)) score -= 20;
  else if (/\d/.test(lower)) score -= 12;
  // L-L or single-letter patterns (e.g. "a-b", "x-y") 
  if (/^[a-z][-][a-z]$/i.test(lower) || /^[a-z]{1,2}$/i.test(lower)) score -= 15;

  return Math.max(0, Math.min(100, score));
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
      .limit(1000);

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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { scanId, csvText, csvUrl } = body;
    if (!scanId) throw new Error("Missing scanId");

    // ─── INITIAL CALL: Parse CSV, extract .com domains, store for chunked pre-screening ───
    if (csvText || csvUrl) {
      let initialCsvText = csvText as string | undefined;
      let userId: string | null = null;

      // Shared daily-drops.csv can be loaded without auth
      const isSharedCsv = csvUrl && csvUrl.includes("/store/daily-drops.csv");

      if (!isSharedCsv) {
        // Require auth for non-shared CSVs
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

      // Parse CSV — extract .com domains only (lightweight, no scoring yet)
      const lines = initialCsvText.trim().split("\n");
      const header = lines[0].toLowerCase();
      const cols = header.split(",").map((c: string) => c.trim().replace(/"/g, ""));
      let domainCol = cols.findIndex((c: string) =>
        c === "domain" || c === "domain name" || c === "domainname" || c === "name"
      );
      if (domainCol === -1) domainCol = 0;

      const totalParsed = lines.length - 1;
      const comDomains: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c: string) => c.trim().replace(/"/g, ""));
        const domain = row[domainCol]?.toLowerCase().trim();
        if (!domain || !domain.endsWith(".com") || domain.length <= 4) continue;
        comDomains.push(domain);
      }

      console.log(`Initial parse: ${totalParsed} total → ${comDomains.length} .com domains — starting chunked pre-screen`);

      // Store raw .com domains with "---RAW---" marker for pre-screening phase
      const csvData = "---RAW---\n" + comDomains.join("\n");

      await adminClient.from("drop_scans").update({
        total_domains: totalParsed,
        filtered_domains: 0,
        status: "pre-screening",
        csv_data: csvData,
        resume_from: 0,
      }).eq("id", scanId);

      // Self-invoke to start chunked pre-screening
      queueNextEvaluateInvocation(supabaseUrl, serviceKey, scanId, "initial-queue");

      return new Response(JSON.stringify({
        success: true, queued: true,
        total: totalParsed, comDomains: comDomains.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHAINED INVOCATION: Pre-screen or AI evaluate ───
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

    const PRE_SCREEN_CHUNK = 15000; // domains per pre-screening invocation

    // ─── PRE-SCREENING PHASE (chunked) ───
    if (scan.status === "pre-screening") {
      const rawLines = (scan.csv_data || "").split("\n");
      const qualifiedMarkerIdx = rawLines.indexOf("---QUALIFIED---");
      const rawEndIdx = qualifiedMarkerIdx >= 0 ? qualifiedMarkerIdx : rawLines.length;

      // First line is "---RAW---", raw domains are stored before "---QUALIFIED---"
      const allRaw = rawLines.slice(1, rawEndIdx).filter(Boolean);
      const startIdx = scan.resume_from || 0;
      const endIdx = Math.min(startIdx + PRE_SCREEN_CHUNK, allRaw.length);
      const chunk = allRaw.slice(startIdx, endIdx);

      if (chunk.length === 0) {
        // Pre-screening complete — no qualified domains found
        await adminClient.from("drop_scans").update({
          status: "complete",
          csv_data: null,
        }).eq("id", scanId);
        return new Response(JSON.stringify({ success: true, status: "complete", qualified: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load comparable keywords once per chain (cached in function instance)
      const comparableKeywords = await loadComparableKeywords(adminClient);

      const scoredDomains: { domain: string; score: number }[] = [];
      for (const domain of chunk) {
        const sld = domain.replace(/\.com$/, "");

        // Hard gate: reject hyphens/numbers with strict rules
        const hasHyphen = sld.includes("-");
        const hasNumber = /\d/.test(sld);
        
        // Always reject hyphens — never brandable
        if (hasHyphen) continue;
        
        if (hasNumber) {
          // Reject dimension patterns (4x4, 2x2, 10x10, etc.)
          if (/\d+x\d+/i.test(sld)) continue;
          // Reject leading digits (4sale, 3dprint, etc.)
          if (/^\d/.test(sld)) continue;
          // Reject multiple digit groups (go2buy4less, etc.)
          if ((sld.match(/\d+/g) || []).length > 1) continue;
          // For single digit: only allow if high-value keyword is dominant (>50% of alpha chars)
          const cleanSld = sld.replace(/[0-9]/g, "");
          const hasHighValue = [...HIGH_VALUE_KEYWORDS].some(kw => kw.length >= 3 && cleanSld.includes(kw));
          if (!hasHighValue) continue;
          // Even with a keyword, the keyword must be >50% of alpha chars
          const bestKw = [...HIGH_VALUE_KEYWORDS].filter(kw => kw.length >= 3 && cleanSld.includes(kw))
            .sort((a, b) => b.length - a.length)[0];
          if (!bestKw || bestKw.length / cleanSld.length < 0.5) continue;
        }

        const quality = quickQualityScore(sld, comparableKeywords);
        if (quality >= QUALITY_THRESHOLD) {
          scoredDomains.push({ domain, score: quality });
        }
      }

      // Append qualified domains to existing qualified list stored elsewhere
      // We accumulate qualified domains in a separate field approach:
      // read existing qualified, append new ones, write back
      const existingQualified = (scan.filtered_domains || 0);
      const newQualified = existingQualified + scoredDomains.length;

      // Build accumulated qualified list — retrieve any previously qualified
      // We store qualified domains after the raw data, separated by "---QUALIFIED---"
      let previousQualified: string[] = [];
      if (qualifiedMarkerIdx >= 0) {
        previousQualified = rawLines.slice(qualifiedMarkerIdx + 1).filter(Boolean);
      }

      // Sort new batch and merge
      scoredDomains.sort((a, b) => b.score - a.score);
      const allQualified = [...previousQualified];
      for (const d of scoredDomains) {
        // Store as "domain|score" to preserve tier info
        allQualified.push(`${d.domain}|${d.score}`);
      }

      console.log(`Pre-screen chunk ${startIdx}-${endIdx}/${allRaw.length}: ${chunk.length} checked → ${scoredDomains.length} qualified (total: ${newQualified})`);

      const nextIdx = endIdx;
      if (nextIdx >= allRaw.length) {
        // Pre-screening complete — transition to AI evaluation
        // Sort all qualified by score, separate into premium/standard tiers
        const allScored = allQualified.map(entry => {
          const [domain, scoreStr] = entry.split("|");
          return { domain, score: Number(scoreStr) || 0 };
        });
        allScored.sort((a, b) => b.score - a.score);

        const premiumDomains = allScored.filter(d => d.score >= PREMIUM_TIER_THRESHOLD).map(d => d.domain);
        const standardDomains = allScored.filter(d => d.score < PREMIUM_TIER_THRESHOLD).map(d => d.domain);
        const csvData = [...premiumDomains, "---TIER---", ...standardDomains].join("\n");

        console.log(`Pre-screening complete: ${allScored.length} qualified → ${premiumDomains.length} premium, ${standardDomains.length} standard`);

        await adminClient.from("drop_scans").update({
          filtered_domains: allScored.length,
          status: "evaluating",
          csv_data: csvData,
          resume_from: 0,
        }).eq("id", scanId);
      } else {
        // More pre-screening to do — store progress
        const rawPart = rawLines.slice(0, qualifiedMarkerIdx >= 0 ? qualifiedMarkerIdx : rawLines.length);
        const updatedCsvData = [...rawPart, "---QUALIFIED---", ...allQualified].join("\n");

        await adminClient.from("drop_scans").update({
          filtered_domains: newQualified,
          resume_from: nextIdx,
          csv_data: updatedCsvData,
        }).eq("id", scanId);
      }

      // Self-chain to continue
      queueNextEvaluateInvocation(supabaseUrl, serviceKey, scanId, "pre-screen");

      return new Response(JSON.stringify({ success: true, phase: "pre-screening", processed: endIdx, total: allRaw.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AI EVALUATION PHASE ───
    // Parse tiered domain list
    const rawDomains = (scan.csv_data || "").split("\n").filter(Boolean);
    const tierIdx = rawDomains.indexOf("---TIER---");
    const premiumDomains = tierIdx >= 0 ? rawDomains.slice(0, tierIdx) : [];
    const standardDomains = tierIdx >= 0 ? rawDomains.slice(tierIdx + 1) : rawDomains;
    const allDomains = [...premiumDomains, ...standardDomains];

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

    // Determine which domains in this chunk are premium tier
    const premiumSet = new Set(premiumDomains);

    let evaluated = startIdx;
    for (let i = 0; i < chunk.length; i += AI_BATCH_SIZE) {
      const batch = chunk.slice(i, i + AI_BATCH_SIZE);
      const isPremiumBatch = batch.some(d => premiumSet.has(d));

      // ─── COST-OPTIMISED: Premium get Flash, standard get Flash-Lite ───
      const model = isPremiumBatch ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite";

      const prompt = isPremiumBatch
        ? `You are a SENIOR domain name investor with 20+ years of aftermarket experience. These are PRE-SCREENED HIGH-QUALITY domains that passed our heuristic engine. Give them a THOROUGH evaluation.

For each domain, deeply analyze:
- Exact keyword commercial value (what industries would buy this?)
- Realistic comparable sales (what have similar domains sold for?)
- End-user buyer potential (what companies/startups would want this?)
- Brandability: Is the name memorable, easy to spell, sounds professional?
- SEO value: Does it contain high-volume search keywords?
- Resale timeline: Quick flip or long-term hold?

Score FAIRLY — these are pre-screened quality names, not random junk.
- 85-100: Premium catch (clear $1,000+ value, strong end-user appeal)
- 70-84: Strong catch (solid $500+ potential, multiple buyer segments)
- 50-69: Good potential (worth $100-500, specific niche appeal)
- 30-49: Marginal (low chance of profitable flip)
- 1-29: Pass

Domains to evaluate:
${batch.join("\n")}

Return JSON array: [{domain, score, summary (15 words max), category (brandable|keyword|short|geo|niche|generic|premium|weak), estimated_value (USD), brandability (1-100), keyword_strength (1-100), length_score (1-100)}]`
        : `You are an expert domain name investor. Evaluate each domain for DROP CATCHING potential.

Score STRICTLY — most expiring domains are junk. Only truly good ones should score 70+.
- 85-100: Premium catch (real words, short, high commercial value)
- 70-84: Strong catch (brandable, good keywords, memorable)
- 50-69: Decent potential (usable but not exceptional)
- 30-49: Marginal (might find a buyer eventually)
- 1-29: Pass (not worth the reg fee)

Domains to evaluate:
${batch.join("\n")}

Return JSON array: [{domain, score, summary (15 words max), category (brandable|keyword|short|geo|niche|generic|premium|weak), estimated_value (USD), brandability (1-100), keyword_strength (1-100), length_score (1-100)}]`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: isPremiumBatch
                ? "You are a senior domain investment analyst. These domains passed rigorous pre-screening. Evaluate thoroughly and fairly. Return only valid JSON arrays. No markdown."
                : "You are a domain name investment evaluator. Be STRICT with scores. Return only valid JSON arrays. No markdown."
              },
              { role: "user", content: prompt },
            ],
            temperature: 0,
          }),
        });

        if (!aiResp.ok) {
          const status = aiResp.status;
          if (status === 429 || status === 402) {
            console.warn(`Rate limited (${status}), stopping at ${evaluated}. Model: ${model}`);
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

        await adminClient.from("drop_scans").update({
          evaluated_domains: evaluated,
          resume_from: evaluated,
        }).eq("id", scanId);
      } catch (batchErr) {
        console.error("Batch error:", batchErr);
        evaluated += batch.length;
      }

      // Delay between batches
      if (i + AI_BATCH_SIZE < chunk.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Update resume point
    await adminClient.from("drop_scans").update({
      evaluated_domains: evaluated,
      resume_from: evaluated,
    }).eq("id", scanId);

    // Self-chain or complete
    if (evaluated < allDomains.length) {
      queueNextEvaluateInvocation(supabaseUrl, serviceKey, scanId, "ai-eval");
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
