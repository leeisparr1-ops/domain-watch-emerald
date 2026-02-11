import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Globe2, Loader2, CheckCircle2, XCircle, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TldInfo {
  tld: string;
  popularity: number;
  trust: number;
  regPrice: string;
  renewPrice: string;
  bestFor: string;
  category: "Premium" | "Popular" | "Niche" | "Budget" | "Country" | "Industry";
}

interface TldAvailability {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

const TLD_DATA: TldInfo[] = [
  // Premium
  { tld: ".com", popularity: 100, trust: 98, regPrice: "$9–14", renewPrice: "$14–18", bestFor: "Universal — any business", category: "Premium" },
  { tld: ".io", popularity: 60, trust: 75, regPrice: "$30–50", renewPrice: "$40–60", bestFor: "Startups, tech, dev tools", category: "Premium" },
  { tld: ".ai", popularity: 65, trust: 78, regPrice: "$50–90", renewPrice: "$70–100", bestFor: "AI, machine learning brands", category: "Premium" },
  { tld: ".com.au", popularity: 30, trust: 88, regPrice: "$15–25", renewPrice: "$20–30", bestFor: "Australian businesses", category: "Country" },
  // Popular
  { tld: ".net", popularity: 55, trust: 80, regPrice: "$10–15", renewPrice: "$14–18", bestFor: "Tech, networks, SaaS", category: "Popular" },
  { tld: ".org", popularity: 45, trust: 85, regPrice: "$10–14", renewPrice: "$14–18", bestFor: "Non-profits, communities", category: "Popular" },
  { tld: ".co", popularity: 50, trust: 72, regPrice: "$10–30", renewPrice: "$25–35", bestFor: "Startups, company branding", category: "Popular" },
  { tld: ".me", popularity: 28, trust: 60, regPrice: "$5–15", renewPrice: "$18–25", bestFor: "Personal brands, portfolios", category: "Popular" },
  { tld: ".biz", popularity: 18, trust: 50, regPrice: "$8–15", renewPrice: "$15–20", bestFor: "Small businesses", category: "Popular" },
  { tld: ".cc", popularity: 20, trust: 55, regPrice: "$8–15", renewPrice: "$12–18", bestFor: "Short URLs, branding", category: "Popular" },
  // Industry
  { tld: ".app", popularity: 35, trust: 70, regPrice: "$12–20", renewPrice: "$18–25", bestFor: "Mobile apps, software", category: "Industry" },
  { tld: ".dev", popularity: 30, trust: 68, regPrice: "$12–18", renewPrice: "$16–22", bestFor: "Developers, tools", category: "Industry" },
  { tld: ".tech", popularity: 25, trust: 58, regPrice: "$5–15", renewPrice: "$40–50", bestFor: "Technology companies", category: "Industry" },
  { tld: ".store", popularity: 22, trust: 55, regPrice: "$3–15", renewPrice: "$30–40", bestFor: "E-commerce, retail", category: "Industry" },
  { tld: ".health", popularity: 12, trust: 60, regPrice: "$40–60", renewPrice: "$50–70", bestFor: "Healthcare, wellness", category: "Industry" },
  { tld: ".finance", popularity: 10, trust: 62, regPrice: "$30–50", renewPrice: "$40–60", bestFor: "Financial services", category: "Industry" },
  { tld: ".law", popularity: 8, trust: 65, regPrice: "$60–90", renewPrice: "$70–100", bestFor: "Legal firms, attorneys", category: "Industry" },
  { tld: ".agency", popularity: 15, trust: 52, regPrice: "$5–15", renewPrice: "$20–30", bestFor: "Marketing, creative agencies", category: "Industry" },
  { tld: ".design", popularity: 14, trust: 55, regPrice: "$5–15", renewPrice: "$25–35", bestFor: "Design studios, portfolios", category: "Industry" },
  { tld: ".media", popularity: 12, trust: 50, regPrice: "$5–20", renewPrice: "$25–35", bestFor: "Media companies, publishers", category: "Industry" },
  { tld: ".studio", popularity: 10, trust: 48, regPrice: "$5–15", renewPrice: "$20–30", bestFor: "Creative studios", category: "Industry" },
  // Niche
  { tld: ".gg", popularity: 20, trust: 55, regPrice: "$20–40", renewPrice: "$30–50", bestFor: "Gaming, esports", category: "Niche" },
  { tld: ".xyz", popularity: 40, trust: 45, regPrice: "$1–5", renewPrice: "$12–16", bestFor: "Web3, creative brands", category: "Niche" },
  { tld: ".so", popularity: 12, trust: 50, regPrice: "$15–30", renewPrice: "$20–35", bestFor: "Short brandable names", category: "Niche" },
  { tld: ".sh", popularity: 10, trust: 48, regPrice: "$20–40", renewPrice: "$30–50", bestFor: "Dev tools, shell scripts", category: "Niche" },
  { tld: ".bio", popularity: 8, trust: 52, regPrice: "$5–15", renewPrice: "$15–25", bestFor: "Personal bios, biotech", category: "Niche" },
  { tld: ".club", popularity: 15, trust: 42, regPrice: "$3–10", renewPrice: "$15–20", bestFor: "Communities, clubs", category: "Niche" },
  { tld: ".pro", popularity: 12, trust: 50, regPrice: "$5–15", renewPrice: "$15–25", bestFor: "Professionals, freelancers", category: "Niche" },
  { tld: ".live", popularity: 14, trust: 48, regPrice: "$3–12", renewPrice: "$20–30", bestFor: "Streaming, live events", category: "Niche" },
  // Country
  { tld: ".uk", popularity: 35, trust: 82, regPrice: "$8–15", renewPrice: "$10–18", bestFor: "UK businesses", category: "Country" },
  { tld: ".de", popularity: 40, trust: 85, regPrice: "$8–12", renewPrice: "$10–15", bestFor: "German market", category: "Country" },
  { tld: ".ca", popularity: 25, trust: 80, regPrice: "$10–18", renewPrice: "$15–22", bestFor: "Canadian businesses", category: "Country" },
  { tld: ".fr", popularity: 22, trust: 78, regPrice: "$8–15", renewPrice: "$12–18", bestFor: "French market", category: "Country" },
  { tld: ".nl", popularity: 20, trust: 78, regPrice: "$8–12", renewPrice: "$10–15", bestFor: "Netherlands market", category: "Country" },
  { tld: ".in", popularity: 28, trust: 65, regPrice: "$5–12", renewPrice: "$10–15", bestFor: "Indian market", category: "Country" },
  { tld: ".us", popularity: 18, trust: 60, regPrice: "$5–12", renewPrice: "$10–15", bestFor: "US-based brands", category: "Country" },
  { tld: ".eu", popularity: 18, trust: 72, regPrice: "$5–12", renewPrice: "$10–15", bestFor: "European brands", category: "Country" },
  // Budget
  { tld: ".online", popularity: 18, trust: 48, regPrice: "$2–10", renewPrice: "$30–40", bestFor: "Online businesses", category: "Budget" },
  { tld: ".site", popularity: 16, trust: 44, regPrice: "$2–8", renewPrice: "$25–35", bestFor: "General websites", category: "Budget" },
  { tld: ".info", popularity: 20, trust: 40, regPrice: "$3–8", renewPrice: "$18–22", bestFor: "Informational sites", category: "Budget" },
  { tld: ".click", popularity: 8, trust: 35, regPrice: "$2–6", renewPrice: "$10–15", bestFor: "Short links, marketing", category: "Budget" },
  { tld: ".link", popularity: 10, trust: 38, regPrice: "$3–8", renewPrice: "$12–18", bestFor: "Link shorteners, directories", category: "Budget" },
  { tld: ".space", popularity: 10, trust: 40, regPrice: "$2–8", renewPrice: "$20–30", bestFor: "Creative projects", category: "Budget" },
  { tld: ".fun", popularity: 8, trust: 35, regPrice: "$2–6", renewPrice: "$15–25", bestFor: "Entertainment, casual", category: "Budget" },
];

const categoryColor: Record<string, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  Popular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Industry: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Niche: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Country: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Budget: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function TldComparisonTool() {
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Map<string, TldAvailability>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [tmResult, setTmResult] = useState<ReturnType<typeof checkTrademarkRisk> | null>(null);

  const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
  const displayed = TLD_DATA.filter((t) => !filter || t.category === filter);

  const handleCheckAvailability = async () => {
    if (!cleanKeyword) return;
    setIsChecking(true);
    
    // Run trademark check
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-primary" />
          TLD Comparison Tool
        </CardTitle>
        <CardDescription>
          Compare popularity, trust scores, pricing, and live availability across domain extensions. Enter a keyword and check which TLDs are available.
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
          <Button 
            onClick={handleCheckAvailability} 
            disabled={!cleanKeyword || isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Check All"
            )}
          </Button>
        </div>

        {/* Trademark alert for the keyword */}
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

        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === null ? "default" : "outline"} size="sm" onClick={() => setFilter(null)}>All</Button>
          {["Premium", "Popular", "Industry", "Niche", "Country", "Budget"].map((cat) => (
            <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(filter === cat ? null : cat)}>
              {cat}
            </Button>
          ))}
        </div>

        {availability.size > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Taken</span>
            <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-muted-foreground" /> Unknown</span>
          </div>
        )}

        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                {availability.size > 0 && <TableHead className="text-center w-20">Status</TableHead>}
                <TableHead className="text-center">Popularity</TableHead>
                <TableHead className="text-center">Trust</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Renewal</TableHead>
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
                        {avail ? (
                          <div className="flex justify-center">{statusIcon(avail)}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={t.popularity} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground w-8">{t.popularity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={t.trust} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground w-8">{t.trust}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.regPrice}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.renewPrice}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px]">{t.bestFor}</TableCell>
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
          * Prices are approximate retail ranges. Availability checked via RDAP — some registries may show "Unknown". Always verify with a registrar before purchasing.
        </p>
      </CardContent>
    </Card>
  );
}
