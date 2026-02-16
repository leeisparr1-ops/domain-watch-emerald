import { useState } from "react";
import { Trash2, RefreshCw, ExternalLink, Edit2, Check, X, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioDomain } from "@/hooks/usePortfolio";
import { differenceInDays, parseISO } from "date-fns";
import { getTldRenewalRange } from "@/lib/tldRenewalPricing";

function renewalWarning(d: PortfolioDomain) {
  if (!d.next_renewal_date || d.status === "sold") return null;
  const days = differenceInDays(parseISO(d.next_renewal_date), new Date());
  if (days < 0) return { level: "expired" as const, days, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { level: "critical" as const, days, label: `Expires in ${days}d` };
  if (days <= 30) return { level: "warning" as const, days, label: `Expires in ${days}d` };
  return null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  holding: { label: "Holding", variant: "secondary" },
  listed: { label: "Listed", variant: "default" },
  developing: { label: "Developing", variant: "outline" },
  parked: { label: "Parked", variant: "outline" },
  sold: { label: "Sold", variant: "destructive" },
};

function fmt(n: number | null) {
  if (n == null) return "-";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pnl(current: number | null, cost: number) {
  if (current == null) return { value: "-", color: "" };
  const diff = current - cost;
  const pct = cost > 0 ? ((diff / cost) * 100).toFixed(0) : "∞";
  const sign = diff >= 0 ? "+" : "";
  return {
    value: `${sign}${fmt(diff)} (${sign}${pct}%)`,
    color: diff >= 0 ? "text-green-500" : "text-destructive",
  };
}

interface Props {
  domains: PortfolioDomain[];
  onUpdate: (id: string, updates: Partial<PortfolioDomain>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefreshValuation: (domain: PortfolioDomain) => Promise<void>;
}

export function PortfolioTable({ domains, onUpdate, onDelete, onRefreshValuation }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PortfolioDomain>>({});
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const startEdit = (d: PortfolioDomain) => {
    setEditingId(d.id);
    setEditForm({
      status: d.status,
      sale_price: d.sale_price,
      sale_date: d.sale_date,
      purchase_price: d.purchase_price,
      renewal_cost_yearly: d.renewal_cost_yearly,
    });
  };

  const saveEdit = async (id: string) => {
    await onUpdate(id, editForm);
    setEditingId(null);
  };

  const handleRefresh = async (d: PortfolioDomain) => {
    setRefreshingId(d.id);
    await onRefreshValuation(d);
    setRefreshingId(null);
  };

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No domains in your portfolio yet. Add one to get started!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Domain</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Cost</th>
            <th className="px-4 py-3 font-medium text-right">Current Value</th>
            <th className="px-4 py-3 font-medium text-right">P&L</th>
            <th className="px-4 py-3 font-medium text-right">Sale Price</th>
            <th className="px-4 py-3 font-medium text-right">Renewal</th>
            <th className="px-4 py-3 font-medium">Tags</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => {
            const isEditing = editingId === d.id;
            const p = d.status === "sold"
              ? pnl(d.sale_price, Number(d.purchase_price))
              : pnl(d.auto_valuation, Number(d.purchase_price));
            const status = STATUS_MAP[d.status] ?? STATUS_MAP.holding;

            return (
              <tr key={d.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/tools?domain=${encodeURIComponent(d.domain_name)}`}
                    className="font-medium text-foreground hover:text-primary flex items-center gap-1"
                  >
                    {d.domain_name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </Link>
                  {d.purchase_source && (
                    <span className="text-xs text-muted-foreground">{d.purchase_source}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <Select value={editForm.status ?? d.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="holding">Holding</SelectItem>
                        <SelectItem value="listed">Listed</SelectItem>
                        <SelectItem value="developing">Developing</SelectItem>
                        <SelectItem value="parked">Parked</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={status.variant}>{status.label}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editForm.purchase_price ?? d.purchase_price}
                      onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) || 0 })}
                    />
                  ) : (
                    fmt(Number(d.purchase_price))
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {d.status === "sold" ? "-" : fmt(d.auto_valuation)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${p.color}`}>{p.value}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {isEditing ? (
                    <Input
                      type="number"
                      className="h-8 w-24 text-right"
                      value={editForm.sale_price ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, sale_price: parseFloat(e.target.value) || null })}
                    />
                  ) : (
                    fmt(d.sale_price)
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        className="h-8 w-24 text-right ml-auto"
                        value={editForm.renewal_cost_yearly ?? d.renewal_cost_yearly ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, renewal_cost_yearly: parseFloat(e.target.value) || 0 })}
                      />
                      {(() => {
                        const range = getTldRenewalRange(d.domain_name);
                        if (!range) return null;
                        return (
                          <p className="text-[10px] text-muted-foreground/70 text-right">
                            Typical: ${range.min}–${range.max}/yr
                          </p>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="text-right">
                        <span>{fmt(Number(d.renewal_cost_yearly))}</span>
                        {Number(d.renewal_cost_yearly) === 0 && (() => {
                          const range = getTldRenewalRange(d.domain_name);
                          if (!range) return null;
                          return (
                            <p className="text-[10px] text-muted-foreground/60">
                              ~${range.typical}/yr
                            </p>
                          );
                        })()}
                      </div>
                      {(() => {
                        const warn = renewalWarning(d);
                        if (!warn) return null;
                        const colors = {
                          expired: "text-destructive",
                          critical: "text-destructive",
                          warning: "text-yellow-500",
                        };
                        const Icon = warn.level === "expired" ? AlertTriangle : Clock;
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Icon className={`w-3.5 h-3.5 ${colors[warn.level]} ${warn.level === "critical" ? "animate-pulse" : ""}`} />
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs font-medium">{warn.label}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(d.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(d.id)}>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(d)} title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRefresh(d)}
                          disabled={refreshingId === d.id}
                          title="Refresh valuation"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === d.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(d.id)} title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
