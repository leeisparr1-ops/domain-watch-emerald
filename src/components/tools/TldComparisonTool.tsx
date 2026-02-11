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
  category: "Premium" | "Popular" | "Niche" | "Budget";
}

interface TldAvailability {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

const TLD_DATA: TldInfo[] = [
  { tld: ".com", popularity: 100, trust: 98, regPrice: "$9–14", renewPrice: "$14–18", bestFor: "Universal — any business", category: "Premium" },
  { tld: ".net", popularity: 55, trust: 80, regPrice: "$10–15", renewPrice: "$14–18", bestFor: "Tech, networks, SaaS", category: "Popular" },
  { tld: ".org", popularity: 45, trust: 85, regPrice: "$10–14", renewPrice: "$14–18", bestFor: "Non-profits, communities", category: "Popular" },
  { tld: ".io", popularity: 60, trust: 75, regPrice: "$30–50", renewPrice: "$40–60", bestFor: "Startups, tech, dev tools", category: "Premium" },
  { tld: ".ai", popularity: 65, trust: 78, regPrice: "$50–90", renewPrice: "$70–100", bestFor: "AI, machine learning brands", category: "Premium" },
  { tld: ".co", popularity: 50, trust: 72, regPrice: "$10–30", renewPrice: "$25–35", bestFor: "Startups, company branding", category: "Popular" },
  { tld: ".app", popularity: 35, trust: 70, regPrice: "$12–20", renewPrice: "$18–25", bestFor: "Mobile apps, software", category: "Niche" },
  { tld: ".dev", popularity: 30, trust: 68, regPrice: "$12–18", renewPrice: "$16–22", bestFor: "Developers, tools", category: "Niche" },
  { tld: ".me", popularity: 28, trust: 60, regPrice: "$5–15", renewPrice: "$18–25", bestFor: "Personal brands, portfolios", category: "Popular" },
  { tld: ".xyz", popularity: 40, trust: 45, regPrice: "$1–5", renewPrice: "$12–16", bestFor: "Budget picks, creative brands", category: "Budget" },
  { tld: ".info", popularity: 20, trust: 40, regPrice: "$3–8", renewPrice: "$18–22", bestFor: "Informational sites", category: "Budget" },
  { tld: ".store", popularity: 22, trust: 55, regPrice: "$3–15", renewPrice: "$30–40", bestFor: "E-commerce, retail", category: "Niche" },
  { tld: ".tech", popularity: 25, trust: 58, regPrice: "$5–15", renewPrice: "$40–50", bestFor: "Technology companies", category: "Niche" },
  { tld: ".club", popularity: 15, trust: 42, regPrice: "$3–10", renewPrice: "$15–20", bestFor: "Communities, clubs", category: "Budget" },
  { tld: ".online", popularity: 18, trust: 48, regPrice: "$2–10", renewPrice: "$30–40", bestFor: "Online businesses", category: "Budget" },
  { tld: ".site", popularity: 16, trust: 44, regPrice: "$2–8", renewPrice: "$25–35", bestFor: "General websites", category: "Budget" },
];

const categoryColor: Record<string, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  Popular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Niche: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
          {["Premium", "Popular", "Niche", "Budget"].map((cat) => (
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
