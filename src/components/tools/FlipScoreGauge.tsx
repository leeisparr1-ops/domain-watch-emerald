import { useMemo } from "react";

interface FlipScoreGaugeProps {
  score: number; // 1-10
  size?: number;
}

export function FlipScoreGauge({ score, size = 120 }: FlipScoreGaugeProps) {
  const normalized = Math.max(0, Math.min(100, score * 10));
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (normalized / 100) * circumference;

  const color = useMemo(() => {
    if (score >= 8) return "hsl(var(--chart-2))"; // emerald-ish
    if (score >= 5) return "hsl(var(--chart-1))"; // blue-ish
    if (score >= 3) return "hsl(var(--chart-4))"; // amber-ish
    return "hsl(var(--destructive))";
  }, [score]);

  const label = useMemo(() => {
    if (score >= 9) return "Exceptional";
    if (score >= 7) return "Strong";
    if (score >= 5) return "Moderate";
    if (score >= 3) return "Weak";
    return "Poor";
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Background arc */}
        <path
          d={`M 8 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 4}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M 8 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          className="fill-foreground text-2xl font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {score}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.09 }}
        >
          / 10
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}
