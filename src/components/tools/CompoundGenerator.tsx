import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combine, Copy, ExternalLink, Check, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Curated short words (1-2 syllables preferred) grouped by starting letter
const WORD_BANK: Record<string, string[]> = {
  a: ["ace","act","add","age","aid","aim","air","all","and","ant","ape","arc","ark","arm","art","ash","ask","ate","awe","axe","able","arch","auto"],
  b: ["bad","bag","ban","bar","bat","bay","bed","bet","bid","big","bit","bog","bow","box","bud","bug","bun","bus","but","buy","buzz","back","ball","band","bank","base","beam","bear","beat","bell","bend","best","bike","bind","bird","bite","blow","blue","boat","bold","bolt","bond","bone","book","boot","born","boss","brew","bulk","bump","burn","bust"],
  c: ["cab","cam","can","cap","car","cat","cob","cod","cog","cop","cow","cry","cub","cup","cur","cut","café","cage","cake","call","calm","came","camp","cape","card","care","cart","case","cash","cast","cave","cell","chat","chip","chop","cite","city","clad","clam","clan","clap","claw","clay","clip","club","clue","coal","coat","code","coil","coin","cold","cole","come","cone","cook","cool","cope","copy","cord","core","corn","cost","cozy","crew","crop","crow","cube","cult","cure","curl"],
  d: ["dab","dam","day","den","dew","did","dig","dim","dip","doc","doe","dog","don","dot","dry","dub","dud","due","dug","dun","duo","dye","daft","dale","dame","dare","dark","dart","dash","data","dawn","deal","dear","deck","deed","deem","deep","deer","demo","deny","desk","dial","dice","diet","dime","dine","dire","dirt","disc","dish","disk","dock","dome","done","doom","door","dose","down","drag","draw","drip","drop","drum","duck","duel","dull","dump","dune","dusk","dust","duty"],
  e: ["ear","eat","ebb","eco","eel","egg","ego","elk","elm","emu","end","era","eve","ewe","eye","each","ease","east","easy","edge","edit","epic","even","ever","evil","exam","exit","expo"],
  f: ["fab","fad","fan","far","fat","fax","fed","fee","few","fig","fin","fir","fit","fix","fly","foe","fog","for","fox","fry","fun","fur","face","fact","fade","fail","fair","fake","fall","fame","fang","fare","farm","fast","fate","fawn","fear","feat","feed","feel","fell","felt","fend","fern","fest","file","fill","film","find","fine","fire","firm","fish","fist","five","flag","flap","flat","flaw","flay","fled","flex","flip","flit","flog","flow","flux","foam","foal","focus","fold","folk","fond","font","food","fool","foot","ford","fore","fork","form","fort","foul","four","fowl","free","frog","from","fuel","full","fume","fund","fuse","fury","fuzz"],
  g: ["gab","gag","gal","gap","gas","gel","gem","get","gig","gin","gnu","god","got","gum","gun","gut","guy","gym","gab","gain","gait","gale","game","gang","gape","garb","gate","gave","gawk","gaze","gear","gene","gift","gilt","gird","girl","gist","give","glad","glee","glen","glib","glow","glue","gnaw","goad","goal","goat","goes","gold","golf","gone","good","gown","grab","gram","gray","grew","grid","grim","grin","grip","grit","grow","grub","gulf","gust","guts"],
  h: ["had","ham","has","hat","hay","hen","her","hew","hex","hid","him","hip","his","hit","hob","hog","hop","hot","how","hub","hue","hug","hum","hut","hack","hail","hair","hake","hale","half","hall","halt","hand","hang","hard","hare","harm","harp","hash","haste","hate","haul","have","hawk","haze","hazy","head","heal","heap","hear","heat","heed","heel","held","helm","help","herb","herd","here","hero","hers","hide","high","hike","hill","hilt","hind","hint","hire","hold","hole","home","hone","hood","hook","hope","horn","hose","host","hour","howl","huge","hull","hung","hunt","hurl","hurt","husk","hymn"],
  i: ["ice","icy","ill","imp","ink","inn","ion","ire","irk","isle","inch","info","iron","isle","item","idea","idle"],
  j: ["jab","jag","jam","jar","jaw","jay","jet","jig","job","jog","jot","joy","jug","jut","jack","jade","jail","jake","jamb","jane","jazz","jean","jeer","jest","jive","john","join","joke","jolt","jump","june","junk","jury","just","jute"],
  k: ["keg","ken","key","kid","kin","kit","keen","keep","kelp","kept","kick","kill","kind","king","kink","kiss","kite","knack","knee","knew","knit","knob","knot","know","knit"],
  l: ["lab","lac","lad","lag","lap","law","lax","lay","lea","led","leg","let","lid","lie","lip","lit","log","lot","low","lug","lace","lack","lacy","laid","lair","lake","lamb","lame","lamp","land","lane","lank","lard","lark","lash","lass","last","late","laud","lawn","lazy","lead","leaf","leak","lean","leap","left","lend","lens","lent","less","lest","levy","liar","lick","life","lift","like","lily","limb","lime","limp","line","link","lint","lion","list","live","load","loaf","loam","loan","lock","lode","loft","logo","lone","long","look","loom","loop","loot","lord","lore","lose","loss","lost","loud","love","luck","lull","lump","lure","lurk","lush","lust"],
  m: ["mad","man","map","mar","mat","maw","may","men","met","mid","mix","mob","mod","mop","mow","mud","mug","mum","ace","made","maid","mail","main","make","male","mall","malt","mane","many","mare","mark","mars","mart","mash","mask","mass","mast","mate","maze","meal","mean","meat","meld","melt","memo","mend","menu","mere","mesh","mess","mild","mile","milk","mill","mime","mind","mine","mini","mint","mire","miss","mist","mitt","moan","moat","mock","mode","mold","mole","molt","monk","mood","moon","moor","more","moss","most","moth","move","much","muck","mule","mull","muse","mush","must","mute","myth"],
  n: ["nab","nag","nap","nay","net","new","nil","nip","nit","nod","nor","not","now","nub","nun","nut","nail","name","nape","navy","near","neat","neck","need","neon","nerd","nest","news","next","nice","nick","nine","node","none","noon","norm","nose","note","noun","nova","null","numb"],
  o: ["oak","oar","oat","odd","ode","off","oft","oil","old","one","opt","orb","ore","our","out","ova","owe","owl","own","oar","oath","oats","obey","odds","odor","okay","omen","omit","once","only","onto","opal","open","opus","oral","orca","oven","over","owed","oxen"],
  p: ["pad","pal","pan","pap","par","pat","paw","pay","pea","peg","pen","pep","per","pet","pie","pig","pin","pit","ply","pod","pop","pot","pow","pro","pub","pug","pun","pup","pus","put","pace","pack","pact","page","paid","pail","pain","pair","pale","palm","pane","pang","pant","park","part","pass","past","path","pave","peak","peal","pear","peat","peck","peel","peer","pelt","pend","pent","perk","perm","pest","pick","pier","pike","pile","pill","pine","pink","pint","pipe","plan","play","plea","plot","plow","ploy","plug","plum","plus","pock","poem","poet","poke","pole","poll","polo","pomp","pond","pony","pool","poor","pope","pops","pore","pork","port","pose","post","pour","pout","pray","prey","prod","prop","prow","prude","pull","pulp","pump","punk","pure","push","putt"],
  q: ["quad","quay","quiz","quail","qualm","quark","queen","query","quest","queue","quick","quiet","quill","quirk","quota","quote"],
  r: ["rag","ram","ran","rap","rat","raw","ray","red","ref","rep","rib","rid","rig","rim","rip","rob","rod","roe","rot","row","rub","rug","rum","run","rut","rye","race","rack","raft","rage","raid","rail","rain","rake","ramp","rand","rang","rank","rant","rash","rasp","rate","rave","raze","read","real","ream","reap","rear","reed","reef","reel","rein","rely","rend","rent","rest","rich","ride","rift","rile","rill","rind","ring","rink","riot","rise","risk","rite","road","roam","roar","robe","rock","rode","role","roll","roof","room","root","rope","rose","rosy","rote","rout","rove","rude","ruin","rule","rump","rung","ruse","rush","rust","ruth"],
  s: ["sac","sad","sag","sap","sat","saw","say","sea","set","sew","she","shy","sin","sip","sir","sis","sit","six","ski","sky","sly","sob","sod","son","sop","sot","sow","spa","spy","sub","sue","sum","sun","sup","safe","sage","said","sail","sake","sale","salt","same","sand","sane","sang","sash","save","scan","scar","seal","seam","sear","seat","seed","seek","seem","seen","seep","self","sell","send","sent","sept","shed","shin","ship","shoe","shoo","shop","shot","show","shut","sick","side","sift","sigh","sign","silk","sill","silt","sing","sink","sire","site","size","slab","slag","slam","slap","slat","slaw","slay","sled","slew","slid","slim","slip","slit","slob","slop","slot","slow","slug","slum","slur","smog","snap","snip","snob","snot","snow","snub","snug","soak","soap","soar","sock","soda","sofa","soft","soil","sold","sole","solo","some","song","soon","soot","sore","sort","soul","sour","span","spar","spec","sped","spin","spit","spot","spry","spur","stab","stag","star","stay","stem","step","stew","stir","stop","stub","stud","stun","sway","swim","swot","sync"],
  t: ["tab","tad","tag","tan","tap","tar","tax","tea","ten","the","tie","tin","tip","toe","ton","too","top","tot","tow","toy","try","tub","tug","tun","two","tack","tact","tail","take","tale","talk","tall","tame","tang","tank","tape","tare","tarn","tart","task","team","tear","teem","tell","temp","tend","tens","tent","term","tern","test","text","than","that","them","then","they","thin","this","thus","tick","tide","tidy","tier","tile","till","tilt","time","tine","ting","tint","tiny","tire","toad","toil","told","toll","tomb","tome","tone","took","tool","toot","tops","tore","torn","toss","tour","tout","town","tram","trap","tray","tree","trek","trim","trio","trip","trod","trot","troy","true","tsar","tube","tuck","tuft","tulip","tune","turf","turn","tusk","tuft","twin","type"],
  u: ["ugh","ump","urn","use","uber","ugly","undo","unit","unto","upon","urge","used","user"],
  v: ["van","vat","vet","via","vie","vim","vow","vain","vale","vane","vary","vase","vast","veil","vein","vend","vent","verb","very","vest","veto","vibe","vice","view","vine","visa","vise","void","volt","vote","vows"],
  w: ["wad","wag","war","was","wax","way","web","wed","wet","who","why","wig","win","wit","woe","wok","won","woo","wow","wade","wage","wail","wait","wake","walk","wall","wand","wane","ward","warm","warn","warp","wart","wary","wash","wasp","wave","wavy","waxy","weak","weal","wear","weed","week","well","welt","went","were","west","what","when","whim","whip","whom","wick","wide","wife","wild","will","wilt","wily","wimp","wind","wine","wing","wink","wipe","wire","wise","wish","wisp","with","wits","woke","wolf","womb","wood","wool","word","wore","work","worm","worn","wove","wrap","wren","writ"],
  x: ["xenon","xerox"],
  y: ["yak","yam","yap","yaw","yea","yes","yet","yew","yin","you","yow","yak","yard","yarn","year","yell","yelp","yoga","yoke","yolk","your","yurt"],
  z: ["zap","zed","zen","zig","zip","zoo","zeal","zero","zest","zinc","zing","zone","zoom"],
};

const TLD_OPTIONS = [".com", ".io", ".co", ".ai", ".app", ".dev", ".net", ".org", ".xyz"];

interface CompoundResult {
  domain: string;
  keyword: string;
  suffix: string;
  tld: string;
  available?: boolean | null; // null = not checked
}

export const CompoundGenerator = () => {
  const [keyword, setKeyword] = useState("");
  const [selectedTlds, setSelectedTlds] = useState<string[]>([".com"]);
  const [maxLength, setMaxLength] = useState<string>("15");
  const [results, setResults] = useState<CompoundResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(() => {
    const kw = keyword.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (kw.length < 2) {
      toast.error("Enter a keyword with at least 2 letters");
      return;
    }

    const lastChar = kw[kw.length - 1];
    const words = WORD_BANK[lastChar] || [];
    if (words.length === 0) {
      toast.error(`No suffix words found starting with "${lastChar}"`);
      return;
    }

    const max = parseInt(maxLength) || 30;
    const compounds: CompoundResult[] = [];

    for (const word of words) {
      // Overlap: keyword without last char + word (since word starts with same char)
      const merged = kw.slice(0, -1) + word;
      if (merged.length > max) continue;
      // Skip if merged === keyword
      if (merged === kw) continue;
      // Skip duplicates
      if (compounds.some((c) => c.domain === merged)) continue;

      for (const tld of selectedTlds) {
        compounds.push({
          domain: merged + tld,
          keyword: kw,
          suffix: word,
          tld,
          available: null,
        });
      }
    }

    setResults(compounds);
    setGenerated(true);
    toast.success(`Generated ${compounds.length} compound domains`);
  }, [keyword, selectedTlds, maxLength]);

  const checkAvailability = useCallback(async () => {
    if (results.length === 0) return;
    setChecking(true);

    const domains = results.map((r) => r.domain);
    const CHUNK = 400;

    try {
      const allStatuses: Record<string, boolean> = {};

      for (let i = 0; i < domains.length; i += CHUNK) {
        const chunk = domains.slice(i, i + CHUNK);
        const { data, error } = await supabase.functions.invoke("check-domain-availability", {
          body: { domains: chunk },
        });
        if (error) throw error;
        if (data?.results) {
          for (const r of data.results) {
            allStatuses[r.domain] = r.available;
          }
        }
      }

      setResults((prev) =>
        prev.map((r) => ({
          ...r,
          available: allStatuses[r.domain] ?? null,
        }))
      );

      const availCount = Object.values(allStatuses).filter(Boolean).length;
      toast.success(`${availCount} available out of ${domains.length} checked`);
    } catch (err: any) {
      toast.error("Availability check failed: " + (err.message || "Unknown error"));
    } finally {
      setChecking(false);
    }
  }, [results]);

  const copyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain);
    setCopied(domain);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleTld = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    );
  };

  const availableResults = results.filter((r) => r.available === true);
  const uncheckedResults = results.filter((r) => r.available === null);
  const unavailableResults = results.filter((r) => r.available === false);

  const lastChar = keyword.trim().toLowerCase().replace(/[^a-z]/g, "").slice(-1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Combine className="w-5 h-5 text-primary" />
          Compound Domain Generator
        </CardTitle>
        <CardDescription>
          Enter a keyword — we overlap its last letter with short words to create brandable compound domains.
          E.g. <span className="font-mono text-primary">agentic</span> + <span className="font-mono text-primary">call</span> → <span className="font-mono font-semibold text-primary">agenticall.com</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Enter your keyword (e.g. agentic)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              className="text-base"
            />
            {lastChar && (
              <p className="text-xs text-muted-foreground mt-1">
                Last letter: <span className="font-mono font-bold text-primary">{lastChar}</span> — will combine with {WORD_BANK[lastChar]?.length || 0} words
              </p>
            )}
          </div>
          <Button onClick={generate} className="shrink-0">
            <Combine className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </div>

        {/* Options */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">TLDs</Label>
            <div className="flex flex-wrap gap-2">
              {TLD_OPTIONS.map((tld) => (
                <label key={tld} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedTlds.includes(tld)}
                    onCheckedChange={() => toggleTld(tld)}
                  />
                  {tld}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Max length</Label>
            <Select value={maxLength} onValueChange={setMaxLength}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[8, 10, 12, 15, 20, 25].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} chars</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {generated && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {results.length} compounds generated
                {availableResults.length > 0 && (
                  <span className="text-emerald-500 font-medium"> · {availableResults.length} available</span>
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={checkAvailability}
                disabled={checking}
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                Check Availability
              </Button>
            </div>

            {/* Available first */}
            <div className="flex flex-wrap gap-2">
              {[...availableResults, ...uncheckedResults, ...unavailableResults].map((r) => (
                <button
                  key={r.domain}
                  onClick={() => copyDomain(r.domain)}
                  className={`group relative inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-mono transition-colors
                    ${r.available === true
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : r.available === false
                        ? "border-border/50 bg-muted/30 text-muted-foreground/50 line-through hover:bg-muted/50"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                >
                  {copied === r.domain ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  {r.domain}
                </button>
              ))}
            </div>

            {availableResults.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Register available domains:</p>
                <div className="flex flex-wrap gap-2">
                  {availableResults.slice(0, 10).map((r) => (
                    <a
                      key={r.domain}
                      href={`https://www.spaceship.com/domain/${r.domain.replace(/^\./, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {r.domain} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {generated && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No compound domains generated. Try a different keyword or increase the max length.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
