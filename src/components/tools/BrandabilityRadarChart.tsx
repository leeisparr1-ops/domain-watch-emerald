import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import type { BrandabilityDimension } from "@/lib/brandability";

interface BrandabilityRadarChartProps {
  dimensions: BrandabilityDimension[];
}

const SHORT_LABELS: Record<string, string> = {
  "Pronounceability": "Pronounce",
  "Length": "Length",
  "Word Structure": "Structure",
  "Trademark Safety": "Trademark",
  "Memorability": "Memory",
  "Visual Appeal": "Visual",
};

export function BrandabilityRadarChart({ dimensions }: BrandabilityRadarChartProps) {
  const data = dimensions.map((d) => ({
    subject: SHORT_LABELS[d.name] || d.name,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
