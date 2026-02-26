import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Globe2, Loader2, CheckCircle2, XCircle, HelpCircle, ShieldAlert, TrendingUp, TrendingDown, Minus, Lightbulb, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TldInfo {
  tld: string;
  popularity: number;
  trust: number;
  spamRisk: number; // 0-100, higher = more spam
  regPrice: string;
  renewPrice: string;
  liquidity: "High" | "Medium" | "Low"; // aftermarket liquidity tier
  yoyGrowth: number; // % year-over-year registration growth
  investorScore: number; // 0-100 investment attractiveness
  bestFor: string;
  bestNiches: string[]; // which niches this TLD excels in
  category: "Premium" | "Popular" | "Niche" | "Budget" | "Country" | "Industry";
}

interface TldAvailability {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

type SortField = "tld" | "popularity" | "trust" | "spamRisk" | "yoyGrowth" | "investorScore";
type SortDir = "asc" | "desc";

const NICHES = [
  "AI / Tech",
  "Fintech",
  "E-Commerce",
  "Gaming",
  "Health",
  "Legal",
  "Creative / Design",
  "SaaS / Dev Tools",
  "Personal Brand",
  "Web3 / Crypto",
  "Local / Regional",
] as const;

const TLD_DATA: TldInfo[] = [
  // Premium
  { tld: ".com", popularity: 100, trust: 98, spamRisk: 12, regPrice: "$9–14", renewPrice: "$14–18", liquidity: "High", yoyGrowth: 2, investorScore: 95, bestFor: "Universal — any business", bestNiches: ["AI / Tech", "Fintech", "E-Commerce", "SaaS / Dev Tools", "Health", "Legal", "Personal Brand"], category: "Premium" },
  { tld: ".io", popularity: 60, trust: 75, spamRisk: 18, regPrice: "$30–50", renewPrice: "$40–60", liquidity: "High", yoyGrowth: 8, investorScore: 82, bestFor: "Startups, tech, dev tools", bestNiches: ["AI / Tech", "SaaS / Dev Tools", "Web3 / Crypto"], category: "Premium" },
  { tld: ".ai", popularity: 65, trust: 78, spamRisk: 10, regPrice: "$50–90", renewPrice: "$70–100", liquidity: "High", yoyGrowth: 42, investorScore: 96, bestFor: "AI, machine learning brands", bestNiches: ["AI / Tech", "SaaS / Dev Tools", "Fintech"], category: "Premium" },
  { tld: ".com.au", popularity: 30, trust: 88, spamRisk: 8, regPrice: "$15–25", renewPrice: "$20–30", liquidity: "Low", yoyGrowth: 1, investorScore: 40, bestFor: "Australian businesses", bestNiches: ["Local / Regional"], category: "Country" },
  // Popular
  { tld: ".net", popularity: 55, trust: 80, spamRisk: 22, regPrice: "$10–15", renewPrice: "$14–18", liquidity: "Medium", yoyGrowth: -1, investorScore: 55, bestFor: "Tech, networks, SaaS", bestNiches: ["AI / Tech", "SaaS / Dev Tools"], category: "Popular" },
  { tld: ".org", popularity: 45, trust: 85, spamRisk: 15, regPrice: "$10–14", renewPrice: "$14–18", liquidity: "Medium", yoyGrowth: 0, investorScore: 45, bestFor: "Non-profits, communities", bestNiches: ["Health", "Creative / Design"], category: "Popular" },
  { tld: ".co", popularity: 50, trust: 72, spamRisk: 25, regPrice: "$10–30", renewPrice: "$25–35", liquidity: "Medium", yoyGrowth: 5, investorScore: 65, bestFor: "Startups, company branding", bestNiches: ["AI / Tech", "Fintech", "E-Commerce"], category: "Popular" },
  { tld: ".me", popularity: 28, trust: 60, spamRisk: 30, regPrice: "$5–15", renewPrice: "$18–25", liquidity: "Low", yoyGrowth: -2, investorScore: 38, bestFor: "Personal brands, portfolios", bestNiches: ["Personal Brand", "Creative / Design"], category: "Popular" },
  { tld: ".biz", popularity: 18, trust: 50, spamRisk: 45, regPrice: "$8–15", renewPrice: "$15–20", liquidity: "Low", yoyGrowth: -5, investorScore: 20, bestFor: "Small businesses", bestNiches: ["E-Commerce"], category: "Popular" },
  { tld: ".cc", popularity: 20, trust: 55, spamRisk: 35, regPrice: "$8–15", renewPrice: "$12–18", liquidity: "Low", yoyGrowth: -3, investorScore: 25, bestFor: "Short URLs, branding", bestNiches: ["Personal Brand"], category: "Popular" },
  // Industry
  { tld: ".app", popularity: 35, trust: 70, spamRisk: 12, regPrice: "$12–20", renewPrice: "$18–25", liquidity: "Medium", yoyGrowth: 12, investorScore: 72, bestFor: "Mobile apps, software", bestNiches: ["AI / Tech", "SaaS / Dev Tools"], category: "Industry" },
  { tld: ".dev", popularity: 30, trust: 68, spamRisk: 10, regPrice: "$12–18", renewPrice: "$16–22", liquidity: "Medium", yoyGrowth: 15, investorScore: 70, bestFor: "Developers, tools", bestNiches: ["SaaS / Dev Tools", "AI / Tech"], category: "Industry" },
  { tld: ".tech", popularity: 25, trust: 58, spamRisk: 28, regPrice: "$5–15", renewPrice: "$40–50", liquidity: "Medium", yoyGrowth: 6, investorScore: 52, bestFor: "Technology companies", bestNiches: ["AI / Tech", "SaaS / Dev Tools"], category: "Industry" },
  { tld: ".store", popularity: 22, trust: 55, spamRisk: 32, regPrice: "$3–15", renewPrice: "$30–40", liquidity: "Low", yoyGrowth: 3, investorScore: 42, bestFor: "E-commerce, retail", bestNiches: ["E-Commerce"], category: "Industry" },
  { tld: ".health", popularity: 12, trust: 60, spamRisk: 8, regPrice: "$40–60", renewPrice: "$50–70", liquidity: "Medium", yoyGrowth: 18, investorScore: 68, bestFor: "Healthcare, wellness", bestNiches: ["Health"], category: "Industry" },
  { tld: ".finance", popularity: 10, trust: 62, spamRisk: 15, regPrice: "$30–50", renewPrice: "$40–60", liquidity: "Medium", yoyGrowth: 10, investorScore: 62, bestFor: "Financial services", bestNiches: ["Fintech"], category: "Industry" },
  { tld: ".law", popularity: 8, trust: 65, spamRisk: 5, regPrice: "$60–90", renewPrice: "$70–100", liquidity: "Medium", yoyGrowth: 8, investorScore: 60, bestFor: "Legal firms, attorneys", bestNiches: ["Legal"], category: "Industry" },
  { tld: ".agency", popularity: 15, trust: 52, spamRisk: 30, regPrice: "$5–15", renewPrice: "$20–30", liquidity: "Low", yoyGrowth: 2, investorScore: 35, bestFor: "Marketing, creative agencies", bestNiches: ["Creative / Design"], category: "Industry" },
  { tld: ".design", popularity: 14, trust: 55, spamRisk: 18, regPrice: "$5–15", renewPrice: "$25–35", liquidity: "Low", yoyGrowth: 5, investorScore: 45, bestFor: "Design studios, portfolios", bestNiches: ["Creative / Design"], category: "Industry" },
  { tld: ".media", popularity: 12, trust: 50, spamRisk: 28, regPrice: "$5–20", renewPrice: "$25–35", liquidity: "Low", yoyGrowth: 1, investorScore: 32, bestFor: "Media companies, publishers", bestNiches: ["Creative / Design"], category: "Industry" },
  { tld: ".studio", popularity: 10, trust: 48, spamRisk: 20, regPrice: "$5–15", renewPrice: "$20–30", liquidity: "Low", yoyGrowth: 4, investorScore: 35, bestFor: "Creative studios", bestNiches: ["Creative / Design"], category: "Industry" },
  // Niche
  { tld: ".gg", popularity: 20, trust: 55, spamRisk: 22, regPrice: "$20–40", renewPrice: "$30–50", liquidity: "Medium", yoyGrowth: 20, investorScore: 72, bestFor: "Gaming, esports", bestNiches: ["Gaming"], category: "Niche" },
  { tld: ".xyz", popularity: 40, trust: 45, spamRisk: 55, regPrice: "$1–5", renewPrice: "$12–16", liquidity: "Medium", yoyGrowth: 8, investorScore: 48, bestFor: "Web3, creative brands", bestNiches: ["Web3 / Crypto", "Personal Brand"], category: "Niche" },
  { tld: ".so", popularity: 12, trust: 50, spamRisk: 20, regPrice: "$15–30", renewPrice: "$20–35", liquidity: "Low", yoyGrowth: 6, investorScore: 45, bestFor: "Short brandable names", bestNiches: ["AI / Tech", "Personal Brand"], category: "Niche" },
  { tld: ".sh", popularity: 10, trust: 48, spamRisk: 25, regPrice: "$20–40", renewPrice: "$30–50", liquidity: "Low", yoyGrowth: 3, investorScore: 38, bestFor: "Dev tools, shell scripts", bestNiches: ["SaaS / Dev Tools"], category: "Niche" },
  { tld: ".bio", popularity: 8, trust: 52, spamRisk: 12, regPrice: "$5–15", renewPrice: "$15–25", liquidity: "Low", yoyGrowth: 10, investorScore: 40, bestFor: "Personal bios, biotech", bestNiches: ["Health", "Personal Brand"], category: "Niche" },
  { tld: ".club", popularity: 15, trust: 42, spamRisk: 48, regPrice: "$3–10", renewPrice: "$15–20", liquidity: "Low", yoyGrowth: -4, investorScore: 22, bestFor: "Communities, clubs", bestNiches: ["Gaming"], category: "Niche" },
  { tld: ".pro", popularity: 12, trust: 50, spamRisk: 28, regPrice: "$5–15", renewPrice: "$15–25", liquidity: "Low", yoyGrowth: 0, investorScore: 30, bestFor: "Professionals, freelancers", bestNiches: ["Personal Brand", "Legal"], category: "Niche" },
  { tld: ".live", popularity: 14, trust: 48, spamRisk: 35, regPrice: "$3–12", renewPrice: "$20–30", liquidity: "Low", yoyGrowth: 2, investorScore: 28, bestFor: "Streaming, live events", bestNiches: ["Gaming", "Creative / Design"], category: "Niche" },
  // Country
  { tld: ".uk", popularity: 35, trust: 82, spamRisk: 12, regPrice: "$8–15", renewPrice: "$10–18", liquidity: "Medium", yoyGrowth: 1, investorScore: 48, bestFor: "UK businesses", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".de", popularity: 40, trust: 85, spamRisk: 10, regPrice: "$8–12", renewPrice: "$10–15", liquidity: "Medium", yoyGrowth: 0, investorScore: 50, bestFor: "German market", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".ca", popularity: 25, trust: 80, spamRisk: 10, regPrice: "$10–18", renewPrice: "$15–22", liquidity: "Low", yoyGrowth: 2, investorScore: 42, bestFor: "Canadian businesses", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".fr", popularity: 22, trust: 78, spamRisk: 12, regPrice: "$8–15", renewPrice: "$12–18", liquidity: "Low", yoyGrowth: 1, investorScore: 38, bestFor: "French market", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".nl", popularity: 20, trust: 78, spamRisk: 10, regPrice: "$8–12", renewPrice: "$10–15", liquidity: "Low", yoyGrowth: 0, investorScore: 40, bestFor: "Netherlands market", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".in", popularity: 28, trust: 65, spamRisk: 35, regPrice: "$5–12", renewPrice: "$10–15", liquidity: "Low", yoyGrowth: 6, investorScore: 35, bestFor: "Indian market", bestNiches: ["Local / Regional", "AI / Tech"], category: "Country" },
  { tld: ".us", popularity: 18, trust: 60, spamRisk: 40, regPrice: "$5–12", renewPrice: "$10–15", liquidity: "Low", yoyGrowth: -2, investorScore: 28, bestFor: "US-based brands", bestNiches: ["Local / Regional"], category: "Country" },
  { tld: ".eu", popularity: 18, trust: 72, spamRisk: 15, regPrice: "$5–12", renewPrice: "$10–15", liquidity: "Low", yoyGrowth: 0, investorScore: 35, bestFor: "European brands", bestNiches: ["Local / Regional"], category: "Country" },
  // Budget
  { tld: ".online", popularity: 18, trust: 48, spamRisk: 55, regPrice: "$2–10", renewPrice: "$30–40", liquidity: "Low", yoyGrowth: -3, investorScore: 18, bestFor: "Online businesses", bestNiches: ["E-Commerce"], category: "Budget" },
  { tld: ".site", popularity: 16, trust: 44, spamRisk: 58, regPrice: "$2–8", renewPrice: "$25–35", liquidity: "Low", yoyGrowth: -5, investorScore: 15, bestFor: "General websites", bestNiches: [], category: "Budget" },
  { tld: ".info", popularity: 20, trust: 40, spamRisk: 62, regPrice: "$3–8", renewPrice: "$18–22", liquidity: "Low", yoyGrowth: -8, investorScore: 12, bestFor: "Informational sites", bestNiches: [], category: "Budget" },
  { tld: ".click", popularity: 8, trust: 35, spamRisk: 70, regPrice: "$2–6", renewPrice: "$10–15", liquidity: "Low", yoyGrowth: -6, investorScore: 8, bestFor: "Short links, marketing", bestNiches: [], category: "Budget" },
  { tld: ".link", popularity: 10, trust: 38, spamRisk: 65, regPrice: "$3–8", renewPrice: "$12–18", liquidity: "Low", yoyGrowth: -4, investorScore: 10, bestFor: "Link shorteners, directories", bestNiches: [], category: "Budget" },
  { tld: ".space", popularity: 10, trust: 40, spamRisk: 50, regPrice: "$2–8", renewPrice: "$20–30", liquidity: "Low", yoyGrowth: -2, investorScore: 14, bestFor: "Creative projects", bestNiches: ["Creative / Design"], category: "Budget" },
  { tld: ".fun", popularity: 8, trust: 35, spamRisk: 55, regPrice: "$2–6", renewPrice: "$15–25", liquidity: "Low", yoyGrowth: -3, investorScore: 8, bestFor: "Entertainment, casual", bestNiches: ["Gaming"], category: "Budget" },
];

const categoryColor: Record<string, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  Popular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Industry: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Niche: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Country: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Budget: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function GrowthIndicator({ value }: { value: number }) {
  if (value > 5) return <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><TrendingUp className="w-3 h-3" />+{value}%</span>;
  if (value < -2) return <span className="flex items-center gap-0.5 text-red-500 text-xs font-medium"><TrendingDown className="w-3 h-3" />{value}%</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="w-3 h-3" />{value > 0 ? "+" : ""}{value}%</span>;
}

function SpamBar({ value }: { value: number }) {
  const color = value >= 50 ? "bg-red-500" : value >= 30 ? "bg-orange-400" : value >= 15 ? "bg-yellow-400" : "bg-emerald-500";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-6">{value}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[200px]">
        Spam risk score (0-100). Higher = more abuse/spam associated with this extension.
      </TooltipContent>
    </Tooltip>
  );
}

function InvestorBadge({ score }: { score: number }) {
  let label: string, classes: string;
  if (score >= 80) { label = "A+"; classes = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"; }
  else if (score >= 60) { label = "A"; classes = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"; }
  else if (score >= 40) { label = "B"; classes = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"; }
  else if (score >= 20) { label = "C"; classes = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"; }
  else { label = "D"; classes = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"; }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-xs font-bold ${classes}`}>{label}</Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        Investor Grade ({score}/100) — composite of aftermarket liquidity, trust, growth trend, and spam risk.
      </TooltipContent>
    </Tooltip>
  );
}

export function TldComparisonTool() {
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [availability, setAvailability] = useState<Map<string, TldAvailability>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [tmResult, setTmResult] = useState<ReturnType<typeof checkTrademarkRisk> | null>(null);
  const [sortField, setSortField] = useState<SortField>("investorScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");

  const displayed = useMemo(() => {
    let items = TLD_DATA.filter((t) => {
      if (filter && t.category !== filter) return false;
      if (nicheFilter !== "all" && !t.bestNiches.includes(nicheFilter)) return false;
      return true;
    });
    items = [...items].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return items;
  }, [filter, nicheFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const handleCheckAvailability = async () => {
    if (!cleanKeyword) return;
    setIsChecking(true);
    setTmResult(checkTrademarkRisk(cleanKeyword + ".com"));

    const domains = TLD_DATA.map((t) => `${cleanKeyword}${t.tld}`);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain-availability", {
        body: { domains },
      });
      if (error || !data?.results) {
        console.error("Availability check failed:", error);
        setIsChecking(false);
        return;
      }
      const newMap = new Map<string, TldAvailability>();
      (data.results as TldAvailability[]).forEach((r) => newMap.set(r.domain, r));
      setAvailability(newMap);
    } catch (e) {
      console.error("Availability check error:", e);
    } finally {
      setIsChecking(false);
    }
  };

  const statusIcon = (status: TldAvailability | undefined) => {
    if (!status) return null;
    if (status.status === "available") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (status.status === "registered") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  // Niche recommender: top TLDs for selected niche
  const nicheRecommendations = useMemo(() => {
    if (nicheFilter === "all") return null;
    return TLD_DATA
      .filter((t) => t.bestNiches.includes(nicheFilter))
      .sort((a, b) => b.investorScore - a.investorScore)
      .slice(0, 5);
  }, [nicheFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-primary" />
          TLD Comparison Tool
        </CardTitle>
        <CardDescription>
          Compare investor grades, liquidity, spam risk, growth trends, and live availability across 45+ domain extensions. Click column headers to sort.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a keyword (e.g. cloudpay)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheckAvailability()}
            className="flex-1"
          />
          <Button onClick={handleCheckAvailability} disabled={!cleanKeyword || isChecking}>
            {isChecking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
            ) : "Check All"}
          </Button>
        </div>

        {tmResult && tmResult.riskLevel !== "none" && (
          <div className={`p-3 rounded-lg border ${tmResult.riskLevel === "high" ? "border-red-500/20 bg-red-500/5" : tmResult.riskLevel === "medium" ? "border-orange-500/20 bg-orange-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Trademark Warning</span>
                  <Badge variant="outline" className={`text-xs ${getTrademarkRiskDisplay(tmResult.riskLevel).color}`}>
                    {getTrademarkRiskDisplay(tmResult.riskLevel).label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tmResult.summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
            <Button variant={filter === null ? "default" : "outline"} size="sm" onClick={() => setFilter(null)}>All</Button>
            {["Premium", "Popular", "Industry", "Niche", "Country", "Budget"].map((cat) => (
              <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(filter === cat ? null : cat)}>
                {cat}
              </Button>
            ))}
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {NICHES.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Niche Recommender Card */}
        {nicheRecommendations && nicheRecommendations.length > 0 && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Top TLDs for {nicheFilter}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {nicheRecommendations.map((t) => (
                <div key={t.tld} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-sm">
                  <span className="font-semibold text-foreground">{t.tld}</span>
                  <InvestorBadge score={t.investorScore} />
                  <GrowthIndicator value={t.yoyGrowth} />
                </div>
              ))}
            </div>
          </div>
        )}

        {availability.size > 0 && (() => {
          const availCount = Array.from(availability.values()).filter(a => a.status === "available").length;
          const takenCount = Array.from(availability.values()).filter(a => a.status === "registered").length;
          const totalChecked = availability.size;
          return (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
                <Globe2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{cleanKeyword}</span>
                <Badge variant="outline" className={`text-xs font-bold ${takenCount >= 20 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30" : takenCount >= 10 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500/30" : takenCount >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                  {takenCount}/{totalChecked} TLDs registered
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {takenCount} Registered</span>
                <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-muted-foreground" /> {availCount} Available</span>
              </div>
            </div>
          );
        })()}

        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("tld")}>
                  <span className="flex items-center gap-1">Domain <SortIcon field="tld" /></span>
                </TableHead>
                {availability.size > 0 && <TableHead className="text-center w-16">Status</TableHead>}
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("investorScore")}>
                  <span className="flex items-center gap-1 justify-center">Grade <SortIcon field="investorScore" /></span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center">Liquidity</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("yoyGrowth")}>
                  <span className="flex items-center gap-1 justify-center">YoY <SortIcon field="yoyGrowth" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("trust")}>
                  <span className="flex items-center gap-1 justify-center">Trust <SortIcon field="trust" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => handleSort("spamRisk")}>
                  <span className="flex items-center gap-1 justify-center">Spam <SortIcon field="spamRisk" /></span>
                </TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Best For</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((t) => {
                const domain = cleanKeyword ? `${cleanKeyword}${t.tld}` : t.tld;
                const avail = availability.get(domain);
                return (
                  <TableRow key={t.tld} className={avail?.status === "available" ? "bg-emerald-500/5" : ""}>
                    <TableCell className={`font-semibold whitespace-nowrap ${avail?.status === "registered" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {domain}
                    </TableCell>
                    {availability.size > 0 && (
                      <TableCell className="text-center">
                        {avail ? <div className="flex justify-center">{statusIcon(avail)}</div> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <InvestorBadge score={t.investorScore} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${t.liquidity === "High" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : t.liquidity === "Medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" : "bg-muted text-muted-foreground border-border"}`}>
                        {t.liquidity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <GrowthIndicator value={t.yoyGrowth} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 justify-center">
                        <Progress value={t.trust} className="h-2 w-12" />
                        <span className="text-xs text-muted-foreground w-6">{t.trust}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SpamBar value={t.spamRisk} />
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">{t.regPrice}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Renewal: {t.renewPrice}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px]">{t.bestFor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${categoryColor[t.category]}`}>
                        {t.category}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground italic">
          * Liquidity reflects relative aftermarket trading volume (High/Medium/Low). Pricing is approximate. Availability checked via RDAP — some registries may show "Unknown". Always verify with a registrar.
        </p>
      </CardContent>
    </Card>
  );
}
