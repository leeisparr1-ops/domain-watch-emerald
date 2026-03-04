import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

interface SEOVolumeSparklineProps {
  monthlySearches: MonthlySearch[];
  height?: number;
  variant?: "compact" | "detailed";
  /** If set and only one keyword has trend data, show which keyword the chart represents */
  topKeyword?: string | null;
  /** Number of keywords aggregated — used to decide whether to show clarifying label */
  keywordCount?: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return v.toLocaleString();
}

export function SEOVolumeSparkline({
  monthlySearches,
  height,
  variant = "detailed",
  topKeyword,
  keywordCount,
}: SEOVolumeSparklineProps) {
  if (!monthlySearches || monthlySearches.length < 2) return null;

  const showKeywordLabel = variant === "detailed" && topKeyword && (keywordCount === undefined || keywordCount <= 1);

  const data = monthlySearches
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-12)
    .map((m) => ({
      label: `${MONTH_LABELS[m.month - 1]} '${String(m.year).slice(2)}`,
      shortLabel: `${MONTH_LABELS[m.month - 1]}`,
      volume: m.search_volume,
    }));

  const first = data[0].volume;
  const last = data[data.length - 1].volume;
  const peak = Math.max(...data.map((d) => d.volume));
  const trendPercent = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const isRising = trendPercent > 5;
  const isFalling = trendPercent < -5;

  const accentColor = isRising
    ? "hsl(var(--chart-2))"
    : isFalling
    ? "hsl(var(--destructive))"
    : "hsl(var(--chart-4))";

  // ── Compact variant (original sparkline) ──
  if (variant === "compact") {
    const h = height ?? 52;
    return (
      <div className="w-full" style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id="sparkFillCompact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "11px",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number) => [value.toLocaleString(), "Volume"]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke={accentColor}
              strokeWidth={1.5}
              fill="url(#sparkFillCompact)"
              dot={false}
              activeDot={{ r: 3, fill: accentColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Detailed variant ──
  const h = height ?? 160;

  const TrendIcon = isRising ? TrendingUp : isFalling ? TrendingDown : Minus;
  const trendLabel = isRising ? "rising" : isFalling ? "falling" : "stable";
  const trendBadgeClass = isRising
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
    : isFalling
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700"
    : "bg-muted text-muted-foreground border-border";

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Search Volume Trends (Last 12 Months)
          </p>
          {showKeywordLabel && (
            <p className="text-[10px] text-muted-foreground/70">
              Showing trend for "{topKeyword}"
            </p>
          )}
        </div>
        <Badge variant="outline" className={`text-[10px] gap-1 ${trendBadgeClass}`}>
          <TrendIcon className="w-3 h-3" />
          {trendPercent > 0 ? "+" : ""}{trendPercent}% {trendLabel}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Current </span>
          <span className="font-semibold text-foreground">{formatVolume(last)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Peak </span>
          <span className="font-semibold text-foreground">{formatVolume(peak)}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="sparkFillDetailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                <stop offset="60%" stopColor={accentColor} stopOpacity={0.08} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 4) - 1)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatVolume}
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
                boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
              }}
              formatter={(value: number) => [value.toLocaleString(), "Monthly searches"]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#sparkFillDetailed)"
              dot={false}
              activeDot={{ r: 5, fill: accentColor, stroke: "hsl(var(--card))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
