import { useState, useEffect } from "react";
import { TrendingUp, Flame, ArrowUp, ArrowDown, Minus, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === "rising") return <ArrowUp className="w-3 h-3 text-green-500" />;
  if (trend === "falling") return <ArrowDown className="w-3 h-3 text-red-500" />;
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
  const keywords: TrendingKeyword[] = Object.entries(enrichment.keywords)
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

  if (keywords.length === 0) return null;

  const displayKeywords = expanded ? keywords : keywords.slice(0, 10);
  const staleLabel = enrichment.stale ? " (data may be stale)" : "";

  return (
    <div className="mb-6 animate-in fade-in duration-500 delay-100">
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
                  {trend && <TrendIcon trend={trend} />}
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
  );
}
