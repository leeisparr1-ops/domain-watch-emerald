import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioStats as Stats } from "@/hooks/usePortfolio";

function fmt(n: number) {
  return "$" + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function PortfolioStats({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Total Invested", value: fmt(stats.totalInvested), icon: DollarSign },
    { label: "Current Value", value: fmt(stats.totalCurrentValue), icon: Package },
    {
      label: "Unrealized P&L",
      value: (stats.unrealizedPnL >= 0 ? "+" : "-") + fmt(stats.unrealizedPnL),
      icon: stats.unrealizedPnL >= 0 ? TrendingUp : TrendingDown,
      color: stats.unrealizedPnL >= 0 ? "text-green-500" : "text-destructive",
    },
    {
      label: "Realized P&L",
      value: (stats.realizedPnL >= 0 ? "+" : "-") + fmt(stats.realizedPnL),
      icon: ShoppingCart,
      color: stats.realizedPnL >= 0 ? "text-green-500" : "text-destructive",
    },
    { label: "Yearly Renewals", value: fmt(stats.totalRenewalCosts), icon: RefreshCw },
    {
      label: "Overall ROI",
      value: (stats.overallROI >= 0 ? "+" : "") + stats.overallROI.toFixed(1) + "%",
      icon: TrendingUp,
      color: stats.overallROI >= 0 ? "text-green-500" : "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/50">
          <CardContent className="p-4 text-center space-y-1">
            <c.icon className={`w-5 h-5 mx-auto ${c.color ?? "text-muted-foreground"}`} />
            <p className={`text-lg font-bold ${c.color ?? "text-foreground"}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
