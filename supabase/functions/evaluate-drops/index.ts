import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_BATCH_SIZE = 25;
const DOMAINS_PER_INVOCATION = 500;

// ─── COMPREHENSIVE WORD DICTIONARIES ───
// Ported from the platform's brandability.ts, pronounceability.ts, and domainValuation.ts engines

const VOWELS = new Set("aeiouy");

const GOOD_BIGRAMS = new Set([
  "th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","ed","is","it","al","ar",
  "st","nt","ng","se","ha","as","ou","io","le","ve","co","me","de","hi","ri","ro","ic","ne","ea",
  "ra","ce","li","ch","ll","be","ma","si","om","ur","ca","el","ta","la","ns","ge","ly","ei","os",
  "no","pe","do","su","pa","ec","ac","di","ol","tr","sh","pr","pl","cr","bl","fl","gr","br","cl",
  "dr","fr","gl","sl","sp","sw","tw","wr","sc","sk","sm","sn",
]);

const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}/i;

// High-value keywords that signal commercial intent (from domainValuation.ts PREMIUM_KEYWORDS)
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
  "bio","gene","sensor","vr","ar","virtual","metaverse","rocket","launch",
  "cannabis","cbd","hemp","glow","fashion","style","wear","recipe",
  "coach","mentor","recruit","hire","talent",
  "ev","fleet","charge","battery","clean","sustain",
  "platform","deploy","pipeline","infra","ops",
  "stream","content","podcast","creator","influencer",
  "neura","spatial","copilot","genai","llm","agentic",
  "esport","loot","raid","quest","arena","guild","clash","boost","rank",
]);

// Comprehensive dictionary: COMMON_WORDS + DICTIONARY_WORDS from platform (3,000+ words)
const DICTIONARY = new Set([
  // 2-letter
  "go","my","up","do","no","so","we","be","me","he","it","in","on","at","to","or","an","by","if","of",
  // 3-letter (comprehensive)
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
  "zip","zoo","ace","aim","arc","ask","axe","bay","bid","bow","bud","cab","cam","clue","cog","cub","dab",
  "den","dew","dig","dim","dot","dub","duo","dye","elm","eve","fad","fax","fir","fog","fur","gag","gel",
  "glow","gut","haze","hex","hue","hug","ire","jab","jag","jig","jot","keg","kit","lag","led","lid",
  "log","lot","lug","lux","nab","nag","nib","nod","nut","ode","oven","own","pal","peg","ply","pry",
  "pun","pup","rag","rub","rye","sag","shy","ski","sly","sob","sod","tab","tax","tub","urn","via",
  "vim","woe","yak","yap","yaw","yen",
  // 4-letter (comprehensive)
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
  "wade","wake","wane","ware","wile","wipe","woke","wove","yoke","bike","bore","came","cube","dupe","duke",
  "faze","flee","fume","gore","jake","knee","lire","lute","mike","mope","ooze","sore","stove","tape",
  "ball","base","bath","beam","bear","bell","belt","bill","bird","blow","boat","body","bolt","bomb","bond",
  "boot","bowl","buck","bull","burn","busy","calm","card","cast","cell","chef","chin","clam","clay","clip",
  "coal","coat","coil","comb","come","cook","corn","cost","crew","crop","crow","cure","curl","dawn","dear",
  "deed","deer","dial","dirt","dish","dose","down","draw","drum","dual","dust","duty","each","emit","exam",
  "exit","face","fact","fail","fair","fall","fate","fear","feel","fill","fish","fist","flag","flat","flaw",
  "foam","fold","folk","fool","foot","fork","fort","four","fowl","from","full","fury","fuss","gait","gale",
  "gang","girl","glad","goat","gone","good","grab","gray","grin","gulf","gust","half","hall","hand","hang",
  "harm","harp","hate","haul","head","heap","hear","heel","herb","herd","hero","hint","hold","hole","holy",
  "hood","horn","host","hour","howl","hull","hung","hurl","hurt","hymn","inch","iron","isle","jail","jazz",
  "joke","jury","keen","kelp","kept","kind","king","knob","knot","lace","lack","laid","lamp","lash","lawn",
  "laze","leaf","leak","lens","less","lick","lieu","like","limb","lime","limp","line","lion","list","live",
  "load","loaf","loan","loft","lone","look","lord","lose","loss","loud","lump","lurk","lust","maid","male",
  "malt","mane","mass","meal","mean","meat","mild","milk","mind","mood","more","moss","moth","much","myth",
  "nail","navy","neat","neck","need","noon","norm","null","oath","obey","oink","once","onto","orca","ounce",
  "oval","over","owns","pair","pale","pall","park","pave","pawn","peak","peel","pier","pile","pill","pink",
  "pint","pipe","plan","plat","play","plea","plow","ploy","plum","plus","poem","poet","poke","pond","pool",
  "poor","pork","pour","prey","prop","pull","pulp","pump","push","quay","rack","raft","rage","ramp","rang",
  "rear","reef","rein","rely","rice","rift","riot","roam","roar","robe","rogue","ruin","sage","sang","sank",
  "sash","scan","scar","seed","seep","shed","shin","shot","shut","sigh","silt","sink","sire","slab","slam",
  "slap","sled","slew","slim","slip","slit","slug","smog","soak","soar","sock","soil","sole","some","soot",
  "sore","span","spar","spec","sped","spun","spur","stab","stag","stem","stew","stir","stud","sway","swim",
  "tack","tact","tale","tall","tang","tarp","tart","tear","than","that","them","then","they","thin","this",
  "thou","tick","tied","till","tilt","toad","toll","tomb","toss","tram","trap","tray","trek","trio","trod",
  "trot","tsar","tuft","tuna","twin","undo","upon","urge","vain","vary","veal","veil","vent","verb","very",
  "vest","vial","visa","wail","wand","wasp","watt","weed","weep","were","what","when","whim","whom","wick",
  "wife","wilt","wimp","wink","wipe","wise","with","womb","wool","worm","worn","wrap","wren","yawn","year",
  // 5-letter (comprehensive)
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
  "chess","chose","claim","class","climb","cling","clock","close","color","comes","count","cover","crash",
  "crawl","crush","dance","doing","doubt","draft","drain","drawn","dress","dried","drink","drift","drops",
  "dying","eager","early","eight","elect","ember","enemy","enjoy","enter","error","essay","ethic","every",
  "exact","exile","exist","fable","faith","false","fancy","fatal","fault","feast","fence","fetch","fever",
  "fewer","fiber","fight","final","fixed","flame","flesh","flint","flood","floor","flora","fluid","flush",
  "flyer","focal","folly","force","forth","found","frame","frank","fraud","froze","fruit","fully","funny",
  "gamma","gauge","genre","ghost","given","glass","gleam","globe","gloom","glory","going","goose","grain",
  "grasp","grass","grave","great","greed","greet","grief","grind","groan","groom","gross","grove","grown",
  "guess","guest","guild","habit","harsh","heavy","hello","hence","honey","honor","horse","hotel","humor",
  "hurry","ideal","image","imply","inbox","indie","intro","issue","ivory","jewel","joint","joker","jumbo",
  "karma","kayak","knack","knife","known","label","labor","lance","large","laser","latch","later","laugh",
  "lease","ledge","legal","lemon","lever","linen","liver","llama","lobby","lodge","lofty","loose","lotus",
  "loved","lover","lower","loyal","lucky","lunar","lunch","lunge","lyric","macro","magic","magma","major",
  "manor","maple","march","marsh","mason","mayor","meant","medal","melee","melon","mercy","merit","merry",
  "metal","meter","might","mimic","miner","minor","minus","mixed","mogul","money","month","moose","moral",
  "mound","mourn","mouse","mouth","multi","music","nerve","never","newly","night","ninja","noble","noise",
  "notch","nurse","occur","often","olive","onset","opera","optic","orbit","other","ought","outdo","owned",
  "oxide","ozone","paint","panic","paper","paste","pause","peace","pearl","penal","perch","piano","piece",
  "pinch","pitch","plain","plane","plate","plead","plumb","plume","plump","plush","poker","polar","porch",
  "pouch","pound","press","pride","print","prior","prism","probe","prone","proof","proud","prove","proxy",
  "psalm","pupil","purge","queen","query","quota","quote","ranch","ratio","react","realm","rebel","refer",
  "relax","relic","reply","ridge","rifle","rigid","rinse","risky","rival","rocky","rogue","roman","roost",
  "rouge","rough","round","route","rover","rugby","ruler","rumor","saint","salad","salon","sauna","scare",
  "scent","scrap","sedan","seize","serum","setup","shade","shaft","shake","shall","shame","shark","sharp",
  "shave","sheer","sheet","shelf","shell","shift","shine","shirt","shock","shoot","shore","short","shout",
  "shown","siege","sized","skate","skull","sleep","slice","slope","smell","smoke","snail","snake","sonic",
  "sorry","sound","spare","spear","spell","spend","spoke","spoon","sport","spray","squad","squid","staff",
  "stain","stair","stale","stall","stamp","stark","stave","steal","steer","stern","stick","still","stoic",
  "stoke","stood","stool","stork","stout","strip","stuck","stuff","stump","stung","stunt","suave","suite",
  "sunny","surge","swamp","swarm","swear","sweat","sweep","swept","swing","swirl","swoop","sword","sworn",
  "syrup","taste","teach","teeth","tempo","tense","terra","thank","thick","thief","thing","third","thorn",
  "those","three","threw","throw","thumb","tidal","tight","timer","title","toast","today","topic","torch",
  "total","tough","towel","toxic","trace","train","tread","treat","tribe","trick","tried","troop","truck",
  "truly","trunk","truth","tulip","tuner","tunic","twist","uncle","under","unite","until","upper","upset",
  "usual","utter","valid","valor","valve","vapor","vault","vegan","venue","verge","verse","vigor","villa",
  "vinyl","viola","viral","virus","visit","vista","vital","vivid","vocal","vodka","vogue","voter","vowel",
  "wages","wagon","waste","watch","water","weary","weave","wedge","wheat","wheel","where","which","while",
  "whirl","whose","wider","widow","woman","women","worse","worst","wound","wrath","write","wrong","wrote",
  "yacht","yearn","young","youth","zebra",
  // 6+ letter (comprehensive — from DICTIONARY_WORDS)
  "action","anchor","beyond","bridge","bright","bundle","canvas","center","choice","circle","clinic",
  "crypto","custom","decode","delete","design","direct","domain","double","enable","energy","engine",
  "expert","falcon","filter","finder","flight","global","golden","growth","health","impact","import",
  "inside","invest","launch","leader","legend","market","master","matrix","method","mobile","modern",
  "motion","native","nature","online","option","output","palace","partner","pocket","portal","profit",
  "public","purple","ranking","record","remote","report","result","rocket","sample","search","secure",
  "select","signal","silver","simple","single","social","source","sphere","sprint","square","status",
  "stream","street","string","strike","strong","studio","summit","supply","switch","system","target",
  "thread","ticket","timber","toggle","travel","triple","unique","unlock","update","venture","vision",
  "wonder","control","access","create","execute","expand","explore","gather","handle","ignite",
  "measure","merge","monitor","multiply","navigate","observe","operate","optimize","perform","predict",
  "process","produce","protect","provide","publish","purchase","pursue","qualify","recover","reduce",
  "refine","refresh","release","render","repair","replace","request","require","rescue","resolve",
  "respond","restore","retain","reveal","review","reward","satisfy","schedule","simplify","solve",
  "support","sustain","track","transfer","transform","trigger","upgrade","upload","verify","connect",
  "deliver","discover","evolve","generate","account","alert","archive","arena","asset","atlas","audio",
  "badge","balance","banner","barrel","barrier","basket","beacon","benefit","blade","blanket","blend",
  "block","board","bonus","bottle","bounce","brain","branch","broker","budget","buffer","bundle",
  "burden","button","canvas","capital","capsule","carbon","cargo","castle","central","chamber",
  "champion","channel","chapter","charge","charter","claim","clarity","climate","cluster","collect",
  "column","combine","comfort","command","commerce","compare","compass","complete","concept","confirm",
  "console","contact","content","context","convert","copper","corner","counter","couple","courage",
  "cover","credit","crisis","crown","crystal","culture","current","curve","custom","cycle","daily",
  "danger","decade","define","demand","dental","deposit","desert","detail","device","dialog","diamond",
  "digital","display","divide","dragon","dream","economy","effect","effort","element","emerge","empire",
  "energy","engine","enjoy","enough","entire","entity","equity","escape","estate","event","exact",
  "exceed","exchange","exhibit","express","extend","fabric","factor","falcon","family","fashion",
  "feature","figure","finance","finger","finish","fiscal","flame","flash","fleet","float","floor",
  "flower","fluid","force","forest","format","fortune","forum","fossil","frame","freedom","freight",
  "frozen","future","galaxy","garden","gather","genius","gentle","giant","glacier","glass","globe",
  "golden","govern","grace","grade","grain","grand","grant","graph","gravity","ground","growth","guide",
  "guitar","habitat","harbor","harvest","haven","hazard","health","height","helmet","hidden","honor",
  "horizon","humble","hunter","hybrid","ideal","image","immune","impact","import","income","index",
  "indoor","infant","inner","input","insert","inside","instant","intent","invest","island","ivory",
  "jacket","jewel","joint","journal","journey","judge","jungle","junior","justice","kernel","kingdom",
  "knight","ladder","lambda","landed","laptop","launch","layer","leader","league","legacy","legend",
  "leisure","lesson","letter","level","lever","liberty","light","limit","linear","liquid","lively",
  "logic","lunar","luxury","machine","magnet","maiden","manner","manual","margin","marine","market",
  "marvel","master","matter","meadow","medal","medium","memory","mental","mentor","method","metric",
  "middle","mighty","million","mineral","mirror","mission","mobile","model","modern","modest","module",
  "moment","motion","motive","mountain","muscle","museum","mutual","mystery","narrow","nation","native",
  "nature","needle","neural","neutral","noble","normal","notion","novel","number","object","obtain",
  "occur","ocean","office","online","option","oracle","orbit","organic","origin","outer","output",
  "outreach","oxygen","package","palace","panel","parent","partner","patent","pattern","payout",
  "people","permit","person","phrase","pilot","pioneer","planet","plasma","platform","player","pledge",
  "pocket","poetry","point","policy","portal","portion","poster","potent","powder","prayer","prefix",
  "premium","primal","prince","print","prison","private","profit","program","promise","prompt","proper",
  "protein","proven","public","puzzle","python","radius","random","ranger","rapid","rattle","reason",
  "rebel","record","reform","refuge","region","relief","remote","rental","rescue","reserve","resort",
  "result","retail","return","reveal","revenue","ribbon","rider","rifle","river","rocket","royal",
  "rubber","runner","sacred","safety","sample","savage","scenic","scheme","school","science","scope",
  "screen","script","search","season","second","secret","sector","senior","sensor","series","server",
  "service","session","settle","shadow","shield","signal","silver","simple","single","sketch","social",
  "socket","source","sphere","spider","spirit","splash","stable","status","steady","steam","steel",
  "storm","story","stream","street","strike","string","studio","submit","summit","supply","surface",
  "surge","surplus","survey","switch","symbol","system","tablet","talent","temple","tender","tensor",
  "terrain","thread","throne","ticket","timber","tissue","title","toggle","tongue","topic","tower",
  "track","trail","trait","trend","tribal","triple","trophy","tunnel","turbo","twelve","united",
  "unity","upper","urban","urgent","useful","valley","value","vapor","vector","vendor","venture",
  "verify","vessel","viable","video","vigor","virtue","vision","visual","vital","vocal","volume",
  "voyage","wallet","wealth","weapon","weekly","weight","window","winter","wisdom","wonder","worker",
  "worthy","intelligence","intelligent","adventure","analysis","animation","application","architect",
  "atmosphere","authority","automobile","beautiful","benchmark","blueprint","brilliant","broadcast",
  "calculate","candidate","catalogue","champion","chocolate","chronicle","classroom","collection",
  "commentary","commission","committee","community","companion","comparison","competition","component",
  "composition","computer","conclusion","condition","conference","confidence","connection","consensus",
  "consequence","consultant","consumer","container","continent","contract","convention","conversation",
  "corporate","correction","counselor","credential","criterion","curiosity","curriculum","dangerous",
  "dashboard","database","daughter","deadline","decision","decorator","dedicated","defendant","designer",
  "detective","developer","diagnosis","dialogue","different","difficult","dimension","direction",
  "director","disaster","discipline","discount","discovery","disorder","distance","distinct","district",
  "dividend","document","domestic","dominant","download","dramatic","durable","dynamics","earnings",
  "economic","ecosystem","education","educator","effective","efficient","election","electric","electron",
  "elephant","elevator","emergency","emission","emotional","emphasis","employee","employer","encounter",
  "endeavor","endurance","engineer","enormous","enterprise","enthusiast","entrance","envelope",
  "environment","equipment","essential","establish","estimate","evidence","evolution","excellent",
  "exception","exclusive","executive","exercise","existence","expansion","expensive","experience",
  "experiment","expertise","explosion","extension","external","extreme","facility","familiar","fantastic",
  "favorite","festival","fiction","financial","firewall","flexible","football","forecast","foreign",
  "formation","formula","foundation","framework","franchise","frequency","friction","frontier",
  "function","furniture","generate","generator","generous","genuine","geography","geometric","gesture",
  "gorgeous","graduate","grateful","guardian","guidance","guideline","handcraft","handbook","happiness",
  "hardware","headline","healthcare","heritage","highlight","historic","homeland","homework","hospital",
  "household","hurricane","hydrogen","imagine","immediate","immigrant","important","impression",
  "incident","inclusion","incredible","independent","indicator","individual","industry","infection",
  "infinite","inflation","influence","informal","ingredient","inherent","injection","innocent",
  "innovation","inspector","inspiration","instance","institute","instrument","insurance","integrity",
  "intention","interest","interior","internal","internet","interval","interview","intimate","invasion",
  "invention","investor","invisible","isolated","landmark","landscape","language","latitude","lavender",
  "learning","leather","lemonade","leverage","lifetime","lighting","likewise","limestone","literary",
  "location","magnetic","mainland","majority","marathon","material","mechanic","medicine","medieval",
  "midnight","military","momentum","mortgage","movement","multiple","navigate","negative","neighbor",
  "nitrogen","notebook","numerous","obstacle","occasion","offering","official","offshore","operator",
  "opponent","opposite","ordinary","original","outbreak","overcome","overview","painting","parallel",
  "passport","patience","peaceful","peculiar","pension","perceive","percent","personal","perspective",
  "petition","pharmacy","physical","pleasant","pleasure","plumbing","politics","positive","possible",
  "postcard","potential","powerful","practice","precious","presence","president","pressure","previous",
  "princess","principal","priority","probable","producer","product","profound","progress","project",
  "prolific","property","proposal","prospect","provider","province","purchase","question","railroad",
  "reaction","readable","receiver","recovery","referral","relation","relative","relevant","reliable",
  "religion","remember","reminder","renowned","reporter","republic","research","resident","resource",
  "response","restrict","revision","romantic","rotation","sandwich","scenario","schedule","scientist",
  "security","semester","sentence","separate","sequence","sergeant","shepherd","shipping","shooting",
  "shortage","shoulder","sidewalk","signature","skeleton","snowflake","software","solution","somebody",
  "southern","specific","spectrum","sporting","standard","standing","starship","starting","strategy",
  "strength","stronger","struggle","stunning","suburban","suitable","sunlight","superior","surprise",
  "survival","survivor","symbolic","sympathy","teaching","technique","teenager","telegram","template",
  "terminal","thinking","thousand","together","tomorrow","topology","tracking","training","treasure",
  "triangle","tropical","tutorial","ultimate","umbrella","uncommon","underway","universe","unlikely",
  "upcoming","vacation","validate","valuable","variable","vertical","vigilant","volatile","volcanic",
  "whatever","wireless","workshop","yourself",
  // Latin-origin & brandable words
  "opus","apex","nexus","axis","crux","flux","lux","pax","rex","vox",
  "praxis","thesis","genesis","aura","circa","coda","ethos","modus",
  "aegis","atlas","helix","onyx","zenith","cipher","sigil",
  // Commonly used compound building blocks
  "consulting","advisory","associates","partners","ventures","holdings","enterprises",
  "corporation","strategic","management","marketing","advertising","branding","creative",
  "agency","workshop","collective","wholesale","distribution","logistics","procurement",
  "blockchain","automation","analytics","algorithm","bandwidth","computing","cybersecurity",
  "datacenter","ecommerce","encryption","firmware","hologram","interface","kubernetes",
  "microchip","middleware","networking","opensource","processor","protocol","robotics",
  "satellite","semiconductor","simulation","streaming","synthetic","terraform","touchscreen",
  "typescript","workflow","cardiology","dermatology","diagnostics","fertility","holistic",
  "immunology","laboratory","neurology","nutrition","oncology","orthopedic","pathology",
  "pediatric","psychiatry","radiology","rehabilitation","surgical","telehealth","therapeutic",
  "veterinary","vitamin","supplement","meditation","mindfulness","accounting","annuity",
  "arbitrage","auditing","bankruptcy","brokerage","commodity","compliance","consolidation",
  "derivative","endowment","fiduciary","microfinance","portfolio","refinance","securities",
  "settlement","sovereign","treasury","underwriting","valuation","volatility",
]);

// Offensive words — instant reject
const OFFENSIVE = new Set([
  "porn","xxx","sex","fuck","shit","dick","cock","bitch","slut","whore","twat","cunt",
  "nude","naked","kill","murder","hate","racist","spam","scam","fraud","viagra","cialis",
  "poo","poop","crap","damn","ass","butt","fart","puke","vomit","barf",
]);

// Negative brand words — penalty (from brandability.ts NEGATIVE_BRAND_WORDS)
const NEGATIVE_BRAND_WORDS = new Set([
  "lost","lose","dead","death","die","dying","kill","grave","tomb",
  "ghost","doom","curse","decay","rot","ruin","fail","broke","broken",
  "crash","error","bug","fault","flaw","void","null","empty","blank",
  "pain","hurt","sick","ill","disease","toxic","poison","burn","bleed",
  "wound","scar","cry","tear","grief","sad","misery","agony",
  "cheap","poor","weak","slow","dull","dark","grim","bleak","cold",
  "harsh","bitter","sour","stale","flat","limp","lazy","boring",
  "bland","plain","basic","generic","average","mediocre",
  "fear","scare","dread","panic","risk","threat","danger","hazard",
  "trap","cage","bind","stuck",
  "war","fight","clash","conflict","enemy","rival","battle",
  "struggle","chaos","mess","wreck",
]);

// Filler/function words that signal a phrase, not a brand (from brandability.ts)
const FILLER_WORDS = new Set([
  "the","this","that","these","those",
  "for","with","from","into","over","under","about","between","through",
  "and","but","nor","yet",
  "is","am","are","was","were","been","being",
  "have","has","had","does","did",
  "can","could","will","would","shall","should","may","might",
  "just","please","not","very","too","also","really","here","there",
]);

// Negative connotation sound patterns (from pronounceability.ts)
const NEGATIVE_SOUNDS = [
  /gr[auo]n/i, /ugh/i, /blech|bleh/i, /sn[aoi]r/i,
  /scr[aue]/i, /squ[eai]/i, /cr[auo][nwk]/i,
];

// ─── DP-BASED DICTIONARY COVERAGE (from brandability.ts) ───

function isKnownWord(word: string): boolean {
  return DICTIONARY.has(word) || HIGH_VALUE_KEYWORDS.has(word);
}

/**
 * DP-based dictionary coverage with portmanteau detection.
 * Returns 0-1 where 1 = 100% of chars are part of known words.
 */
function dictionaryCoverage(sld: string): { words: string[]; coverage: number } {
  const lower = sld.toLowerCase();
  const n = lower.length;
  if (n === 0) return { words: [], coverage: 0 };
  if (n <= 3) {
    if (isKnownWord(lower)) return { words: [lower], coverage: 1.0 };
    return { words: [], coverage: 0 };
  }

  // DP: dp[i] = max chars covered by dictionary words in s[0..i-1]
  const dp = new Array(n + 1).fill(0);
  const parent: (null | { start: number; wordLen: number })[] = new Array(n + 1).fill(null);

  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1]; // skip char
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

  // Backtrack to find words
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

  // Portmanteau boost: check overlapping splits
  if (coveredChars < n) {
    for (let i = 2; i < n - 1; i++) {
      for (let overlap = 1; overlap <= Math.min(4, i, n - i); overlap++) {
        const left = lower.substring(0, i + overlap);
        const right = lower.substring(i);
        if (isKnownWord(left) && isKnownWord(right)) {
          coveredChars = n; // full coverage via portmanteau
          if (words.length === 0) {
            words.push(left, right);
          }
        }
      }
    }
  }

  return { words, coverage: n > 0 ? coveredChars / n : 0 };
}

// ─── SYLLABLE COUNTING (from pronounceability.ts) ───

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

// ─── FAST HEURISTIC QUALITY SCORER ───

const QUALITY_THRESHOLD = 30;

/**
 * Comprehensive heuristic quality score (0-100) for a domain SLD.
 * Uses the same signals as the platform's brandability + pronounceability + keyword demand engines.
 * 
 * Scoring breakdown (max 100):
 *   - Dictionary coverage:     30 pts
 *   - Length sweet spot:        15 pts
 *   - Keyword value:           15 pts
 *   - Bigram quality:          10 pts
 *   - Vowel balance:           10 pts
 *   - Syllable & stress:        8 pts
 *   - Semantic coherence:       7 pts
 *   - Negative/offensive:     -10 to -30 pts
 */
function quickQualityScore(sld: string): number {
  const lower = sld.toLowerCase();
  const len = lower.length;
  let score = 0;

  // ─── INSTANT REJECT: offensive content ───
  for (const word of OFFENSIVE) {
    if (lower.includes(word)) return 0;
  }

  // ─── 1. DICTIONARY COVERAGE (max 30 pts) — the most important signal ───
  const { words, coverage } = dictionaryCoverage(lower);
  const coveragePts = Math.round(coverage * 30);
  score += coveragePts;

  // ─── 2. LENGTH SWEET SPOT (max 15 pts) ───
  if (len <= 3) score += 12;
  else if (len <= 5) score += 15;
  else if (len <= 8) score += 13;
  else if (len <= 10) score += 9;
  else if (len <= 12) score += 5;
  else if (len <= 15) score += 2;
  // 16+ = 0

  // ─── 3. HIGH-VALUE KEYWORD BONUS (max 15 pts) ───
  let kwBonus = 0;
  for (const word of words) {
    if (HIGH_VALUE_KEYWORDS.has(word)) kwBonus += 8;
  }
  // Also check embedded short keywords (ai, ml, etc.)
  for (const kw of HIGH_VALUE_KEYWORDS) {
    if (kw.length <= 3 && lower.includes(kw) && !words.includes(kw)) kwBonus += 3;
  }
  score += Math.min(15, kwBonus);

  // ─── 4. BIGRAM QUALITY (max 10 pts) ───
  let goodBi = 0, totalBi = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    totalBi++;
    if (GOOD_BIGRAMS.has(lower.slice(i, i + 2))) goodBi++;
  }
  score += totalBi > 0 ? Math.round((goodBi / totalBi) * 10) : 0;

  // ─── 5. VOWEL BALANCE (max 10 pts) ───
  const vowelCount = [...lower].filter(c => VOWELS.has(c)).length;
  const vowelRatio = vowelCount / len;
  if (vowelRatio >= 0.25 && vowelRatio <= 0.55) score += 10;
  else if (vowelRatio >= 0.2 && vowelRatio <= 0.6) score += 6;
  else if (vowelRatio >= 0.15) score += 3;

  // ─── 6. SYLLABLE & STRESS PATTERN (max 8 pts) ───
  const syllables = countSyllables(lower);
  if (syllables >= 2 && syllables <= 3) score += 8; // ideal brand rhythm
  else if (syllables === 1) score += 5; // punchy
  else if (syllables === 4) score += 3;
  // 5+ syllables = 0

  // ─── 7. SEMANTIC COHERENCE (max 7 pts) ───
  if (words.length >= 1) {
    const fillerCount = words.filter(w => FILLER_WORDS.has(w)).length;
    const negCount = words.filter(w => NEGATIVE_BRAND_WORDS.has(w)).length;
    
    if (fillerCount === 0 && negCount === 0) {
      if (words.length === 1 || words.length === 2) score += 7; // clean 1-2 word brand
      else if (words.length === 3) score += 3; // acceptable
      // 4+ words = 0 (too complex for brand)
    } else if (fillerCount >= 1) {
      score -= 5; // phrase-like, not brandable
    }
    if (negCount >= 1) score -= 5; // negative connotations
  }

  // ─── PENALTIES ───

  // Consonant clusters
  if (BAD_CLUSTERS.test(lower)) score -= 10;

  // Repeating characters (aaa, bbb)
  if (/(.)\1{2,}/.test(lower)) score -= 8;

  // Negative connotation sounds
  for (const pat of NEGATIVE_SOUNDS) {
    if (pat.test(lower)) { score -= 5; break; }
  }

  // Hyphen penalty
  if (lower.includes("-")) score -= 8;

  // Number penalty  
  if (/\d/.test(lower)) score -= 6;

  return Math.max(0, Math.min(100, score));
}

// ─── MAIN HANDLER ───

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

        // Full heuristic pre-screen using platform-grade scoring
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
