import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface ValueDrivers {
  domain_length: number;
  keywords: number;
  tld: number;
  brandability: number;
  niche_demand: number;
  comparable_sales: number;
  liquidity?: number;
}

interface ValueDriverRadarChartProps {
  drivers: ValueDrivers;
}

const DRIVER_LABELS: Record<string, string> = {
  keywords: "Keywords",
  tld: "TLD",
  brandability: "Brand",
  niche_demand: "Demand",
  domain_length: "Length",
  comparable_sales: "Comps",
  liquidity: "Liquidity",
};

export function ValueDriverRadarChart({ drivers }: ValueDriverRadarChartProps) {
  const data = (Object.keys(DRIVER_LABELS) as (keyof ValueDrivers)[])
    .filter((k) => (drivers[k] || 0) > 0)
    .map((key) => ({
      subject: DRIVER_LABELS[key],
      value: drivers[key] || 0,
      fullMark: 100,
    }));

  if (data.length < 3) return null;

  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Weight"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
