import { ResponsiveContainer, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, Scatter, Cell } from "recharts";

interface KeyComparable {
  domain: string;
  price: string;
  relevance: string;
}

interface ComparablesScatterChartProps {
  comparables: KeyComparable[];
}

function parsePrice(price: string): number {
  const match = price.replace(/[^0-9.]/g, "");
  return parseFloat(match) || 0;
}

export function ComparablesScatterChart({ comparables }: ComparablesScatterChartProps) {
  if (!comparables || comparables.length < 2) return null;

  const data = comparables.map((c, i) => ({
    name: c.domain,
    price: parsePrice(c.price),
    relevance: c.relevance,
    index: i + 1,
  })).filter((d) => d.price > 0);

  if (data.length < 2) return null;

  const colors = [
    "hsl(var(--primary))",
    "hsl(142 76% 36%)",    // emerald
    "hsl(217 91% 60%)",    // blue
    "hsl(280 67% 55%)",    // violet
    "hsl(38 92% 50%)",     // amber
    "hsl(350 89% 60%)",    // rose
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg max-w-[220px]">
        <p className="text-xs font-bold text-foreground">{d.name}</p>
        <p className="text-sm font-bold text-primary mt-0.5">${d.price.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{d.relevance}</p>
      </div>
    );
  };

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="index"
            name="Comparable"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(v) => `#${v}`}
            domain={[0, "auto"]}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Sale Price"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
              if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
              return `$${v}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} r={7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
