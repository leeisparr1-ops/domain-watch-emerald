import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

interface MonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

interface SEOVolumeSparklineProps {
  monthlySearches: MonthlySearch[];
  height?: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SEOVolumeSparkline({ monthlySearches, height = 60 }: SEOVolumeSparklineProps) {
  if (!monthlySearches || monthlySearches.length < 2) return null;

  const data = monthlySearches
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-12)
    .map((m) => ({
      label: `${MONTH_LABELS[m.month - 1]} ${String(m.year).slice(2)}`,
      volume: m.search_volume,
    }));

  const max = Math.max(...data.map((d) => d.volume));
  const min = Math.min(...data.map((d) => d.volume));
  const trend = data.length >= 2 ? data[data.length - 1].volume - data[0].volume : 0;
  const trendColor = trend > 0 ? "hsl(var(--chart-2))" : trend < 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={trendColor} stopOpacity={0.02} />
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
            stroke={trendColor}
            strokeWidth={1.5}
            fill="url(#sparkFill)"
            dot={false}
            activeDot={{ r: 3, fill: trendColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
