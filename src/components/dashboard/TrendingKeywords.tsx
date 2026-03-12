import { useState, useEffect } from "react";
import { TrendingUp, Flame, ArrowUp, ArrowDown, Minus, Sparkles, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchTrendEnrichment, type TrendEnrichment } from "@/lib/trendEnrichment";

interface TrendingKeyword {
  keyword: string;
  heat: number;
  volume?: number;
  trend?: "rising" | "falling" | "stable";
  cpc?: number;
}

interface HotNiche {
  niche: string;
  label: string;
  heat: number;
  emerging_keywords?: string[];
}

function getHeatColor(heat: number): string {
  if (heat >= 2.0) return "text-red-500 dark:text-red-400";
  if (heat >= 1.6) return "text-orange-500 dark:text-orange-400";
  if (heat >= 1.3) return "text-amber-500 dark:text-amber-400";
  return "text-muted-foreground";
}

function getHeatBg(heat: number): string {
  if (heat >= 2.0) return "bg-red-500/10 border-red-500/20 hover:bg-red-500/15";
  if (heat >= 1.6) return "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15";
  if (heat >= 1.3) return "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15";
  return "bg-muted/50 border-border hover:bg-muted";
}

function getHeatLabel(heat: number): string {
  if (heat >= 2.0) return "🔥 Breakout";
  if (heat >= 1.6) return "📈 Hot";
  if (heat >= 1.3) return "⬆️ Rising";
  return "➡️ Stable";
}

function getNicheHeatColor(heat: number): string {
  if (heat >= 80) return "bg-red-500";
  if (heat >= 60) return "bg-orange-500";
  if (heat >= 40) return "bg-amber-500";
  return "bg-muted-foreground/50";
}

function getNicheHeatBorder(heat: number): string {
  if (heat >= 80) return "border-red-500/20 bg-red-500/5";
  if (heat >= 60) return "border-orange-500/20 bg-orange-500/5";
  if (heat >= 40) return "border-amber-500/20 bg-amber-500/5";
  return "border-border bg-muted/30";
}

function TrendIcon({ trend, heat }: { trend?: string; heat?: number }) {
  if (trend === "rising") return <ArrowUp className="w-3 h-3 text-green-500" />;
  if (trend === "falling") return <ArrowDown className="w-3 h-3 text-red-500" />;
  // If no explicit trend but heat > 1.2, it's trending up
  if (!trend && heat && heat > 1.2) return <ArrowUp className="w-3 h-3 text-green-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
}

export function TrendingKeywords() {
  const [enrichment, setEnrichment] = useState<TrendEnrichment | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [nichesExpanded, setNichesExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTrendEnrichment();
        if (!cancelled) setEnrichment(data);
      } catch {
        // silent fail — widget is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !enrichment) return null;

  // Build sorted keyword list by heat (descending), top 20
  // Only show keywords that are actually trending (heat > 1.2), not evergreen baselines
  const keywords: TrendingKeyword[] = Object.entries(enrichment.keywords)
    .filter(([, heat]) => heat > 1.2)
    .map(([keyword, heat]) => {
      const vol = enrichment.keywordVolumes[keyword];
      return {
        keyword,
        heat,
        volume: vol?.volume,
        trend: vol?.trend,
        cpc: vol?.cpc_estimate,
      };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 20);

  // Hot niches sorted by heat
  const niches: HotNiche[] = (enrichment.hotNiches || [])
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 8);

  if (keywords.length === 0 && niches.length === 0) return null;

  const displayKeywords = expanded ? keywords : keywords.slice(0, 10);
  const displayNiches = nichesExpanded ? niches : niches.slice(0, 4);
  const staleLabel = enrichment.stale ? " (data may be stale)" : "";

  return (
    <div className="mb-6 animate-in fade-in duration-500 delay-100 space-y-4">
      {/* Trending Keywords */}
      {keywords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Trending Keywords</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              AI-Powered
            </Badge>
            {enrichment.stale && (
              <span className="text-[10px] text-muted-foreground">{staleLabel}</span>
            )}
          </div>

          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-1.5">
              {displayKeywords.map(({ keyword, heat, volume, trend, cpc }) => (
                <Tooltip key={keyword}>
                  <TooltipTrigger asChild>
                    <button
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-default ${getHeatBg(heat)}`}
                    >
                      {heat >= 2.0 && <Flame className="w-3 h-3 text-red-500 shrink-0" />}
                      {heat >= 1.6 && heat < 2.0 && <TrendingUp className="w-3 h-3 text-orange-500 shrink-0" />}
                      <span className={getHeatColor(heat)}>{keyword}</span>
                      <TrendIcon trend={trend} heat={heat} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-semibold capitalize">{keyword}</p>
                      <p className="text-xs">{getHeatLabel(heat)} · {heat.toFixed(1)}x heat</p>
                      {volume !== undefined && (
                        <p className="text-xs">~{formatVolume(volume)} searches/mo</p>
                      )}
                      {cpc !== undefined && (
                        <p className="text-xs">CPC: ${cpc.toFixed(2)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">Use in patterns to catch trending domains</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {keywords.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>Show less <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Show all {keywords.length} <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Hot Niches */}
      {niches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Hot Niches</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Market Intelligence
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayNiches.map((niche) => (
              <TooltipProvider key={niche.label} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-default ${getNicheHeatBorder(niche.heat)}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{niche.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{niche.niche}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getNicheHeatColor(niche.heat)}`}
                            style={{ width: `${niche.heat}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground w-6 text-right">
                          {niche.heat}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{niche.label}</p>
                      <p className="text-xs">Heat: {niche.heat}/100</p>
                      {niche.emerging_keywords && niche.emerging_keywords.length > 0 && (
                        <p className="text-xs">
                          <span className="text-muted-foreground">Rising:</span>{" "}
                          {niche.emerging_keywords.slice(0, 5).join(", ")}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {niches.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setNichesExpanded(!nichesExpanded)}
            >
              {nichesExpanded ? (
                <>Show less <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Show all {niches.length} niches <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
