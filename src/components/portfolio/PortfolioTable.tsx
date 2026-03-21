import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Trash2, RefreshCw, ExternalLink, AlertTriangle, Clock, StickyNote, CheckSquare, Square, MinusSquare, CalendarClock, Download, ArrowUpDown, ArrowUp, ArrowDown, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioDomain } from "@/hooks/usePortfolio";
import { differenceInDays, parseISO, format, addYears, isPast } from "date-fns";
import { getTldRenewalRange } from "@/lib/tldRenewalPricing";
import { toast } from "sonner";

/** Compute the next renewal/expiry date from purchase_date or next_renewal_date */
function getExpiryDate(d: PortfolioDomain): string | null {
  if (d.next_renewal_date) return d.next_renewal_date;
  if (!d.purchase_date) return null;
  try {
    let date = parseISO(d.purchase_date);
    while (isPast(date)) {
      date = addYears(date, 1);
    }
    return format(date, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function formatExpiryDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return "-";
  }
}

function renewalWarning(d: PortfolioDomain) {
  if (!d.next_renewal_date || d.status === "sold") return null;
  const days = differenceInDays(parseISO(d.next_renewal_date), new Date());
  if (days < 0) return { level: "expired" as const, days, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { level: "critical" as const, days, label: `Expires in ${days}d` };
  if (days <= 30) return { level: "warning" as const, days, label: `Expires in ${days}d` };
  return null;
}

function renewalRoiWarning(d: PortfolioDomain): { label: string; color: string } | null {
  if (d.status === "sold") return null;
  const renewal = Number(d.renewal_cost_yearly) || 0;
  const valuation = d.auto_valuation;
  if (renewal <= 0 || !valuation || valuation <= 0) return null;
  const yearsToBreakEven = valuation / renewal;
  if (yearsToBreakEven < 1) return { label: `⚠️ Renewal > Value — consider dropping`, color: "text-destructive" };
  if (yearsToBreakEven < 2) return { label: `Renewal is ${Math.round(renewal / valuation * 100)}% of value`, color: "text-amber-500" };
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

function getDomainLength(domain: string): number {
  const sld = domain.split(".")[0];
  return sld.length;
}

function getDaysHeld(purchaseDate: string | null): number | null {
  if (!purchaseDate) return null;
  try {
    return differenceInDays(new Date(), parseISO(purchaseDate));
  } catch {
    return null;
  }
}

function formatDaysHeld(days: number | null): string {
  if (days == null) return "-";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  const years = Math.floor(days / 365);
  const months = Math.round((days % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

function getLiveRenewal(domain: string): number {
  const range = getTldRenewalRange(domain);
  return range?.typical ?? 13;
}

// CSV escape helper
function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// -- Inline editable cell component --
interface InlineCellProps {
  value: number | null;
  onSave: (val: number | null) => Promise<void>;
  placeholder?: string;
  allowNull?: boolean;
  prefix?: string;
  className?: string;
  subtext?: React.ReactNode;
}

function InlineEditCell({ value, onSave, placeholder = "0", allowNull = false, prefix = "$", className = "", subtext }: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setLocalVal(value != null ? String(value) : "");
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    const parsed = parseFloat(localVal);
    const newVal = isNaN(parsed) ? (allowNull ? null : 0) : parsed;
    if (newVal !== value) {
      await onSave(newVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        className="h-7 w-24 text-right text-sm font-mono"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className={`text-right font-mono cursor-pointer hover:bg-muted/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors w-full text-sm ${className}`}
      title="Click to edit"
    >
      <span>{value != null ? `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</span>
      {subtext}
    </button>
  );
}

// -- Inline text cell --
interface InlineTextCellProps {
  value: string | null;
  onSave: (val: string | null) => Promise<void>;
  placeholder?: string;
}

function InlineTextCell({ value, onSave, placeholder = "..." }: InlineTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setLocalVal(value ?? "");
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    const newVal = localVal.trim() || null;
    if (newVal !== value) {
      await onSave(newVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        className="h-7 w-32 text-xs"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="cursor-pointer hover:bg-muted/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors text-xs text-left w-full"
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground/40">{placeholder}</span>}
    </button>
  );
}

// -- Sorting --
type SortKey = "domain" | "length" | "status" | "cost" | "list_price" | "value" | "pnl" | "sale_price" | "expires" | "renewal" | "held" | "tags" | "nameservers";
type SortDir = "asc" | "desc";

function SortableHeader({ label, sortKey, currentSort, currentDir, onSort, className = "" }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 font-medium hover:text-foreground transition-colors ${active ? "text-foreground" : ""} ${className}`}
    >
      {label}
      {active ? (
        currentDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

interface Props {
  domains: PortfolioDomain[];
  onUpdate: (id: string, updates: Partial<PortfolioDomain>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteBulk: (ids: string[]) => Promise<void>;
  onRefreshValuation: (domain: PortfolioDomain) => Promise<void>;
  onLookupNameservers: (domainNames: string[]) => Promise<void>;
}

export function PortfolioTable({ domains, onUpdate, onDelete, onDeleteBulk, onRefreshValuation, onLookupNameservers }: Props) {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [refreshingBulk, setRefreshingBulk] = useState(false);
  const [lookingUpNS, setLookingUpNS] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Sort domains
  const sortedDomains = useMemo(() => {
    if (!sortKey) return domains;
    const sorted = [...domains].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "domain":
          cmp = a.domain_name.localeCompare(b.domain_name);
          break;
        case "length":
          cmp = getDomainLength(a.domain_name) - getDomainLength(b.domain_name);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "cost":
          cmp = Number(a.purchase_price) - Number(b.purchase_price);
          break;
        case "list_price":
          cmp = (a.list_price ?? 0) - (b.list_price ?? 0);
          break;
        case "value":
          cmp = (a.auto_valuation ?? 0) - (b.auto_valuation ?? 0);
          break;
        case "pnl": {
          const pnlA = (a.status === "sold" ? (a.sale_price ?? 0) : (a.auto_valuation ?? 0)) - Number(a.purchase_price);
          const pnlB = (b.status === "sold" ? (b.sale_price ?? 0) : (b.auto_valuation ?? 0)) - Number(b.purchase_price);
          cmp = pnlA - pnlB;
          break;
        }
        case "sale_price":
          cmp = (a.sale_price ?? 0) - (b.sale_price ?? 0);
          break;
        case "expires": {
          const ea = getExpiryDate(a) ?? "9999-12-31";
          const eb = getExpiryDate(b) ?? "9999-12-31";
          cmp = ea.localeCompare(eb);
          break;
        }
        case "renewal":
          cmp = (Number(a.renewal_cost_yearly) || getLiveRenewal(a.domain_name)) - (Number(b.renewal_cost_yearly) || getLiveRenewal(b.domain_name));
          break;
        case "held": {
          const da = getDaysHeld(a.purchase_date) ?? -1;
          const db = getDaysHeld(b.purchase_date) ?? -1;
          cmp = da - db;
          break;
        }
        case "tags":
          cmp = (a.tags ?? []).join(",").localeCompare((b.tags ?? []).join(","));
          break;
        case "nameservers":
          cmp = (a.nameservers ?? []).join(",").localeCompare((b.nameservers ?? []).join(","));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [domains, sortKey, sortDir]);

  useEffect(() => {
    const domainIds = new Set(domains.map((d) => d.id));
    setSelected((prev) => {
      const cleaned = new Set([...prev].filter((id) => domainIds.has(id)));
      return cleaned.size !== prev.size ? cleaned : prev;
    });
  }, [domains]);

  const allSelected = domains.length > 0 && selected.size === domains.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(domains.map((d) => d.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await onDeleteBulk(Array.from(selected));
      setSelected(new Set());
      setConfirmBulkDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async (d: PortfolioDomain) => {
    setRefreshingId(d.id);
    await onRefreshValuation(d);
    setRefreshingId(null);
  };

  const handleBulkRefreshRenewals = async () => {
    const selectedDomains = domains.filter((d) => selected.has(d.id) && d.status !== "sold");
    if (selectedDomains.length === 0) return;
    setRefreshingBulk(true);
    toast.info(`Refreshing expiry dates for ${selectedDomains.length} domains...`);
    let done = 0;
    for (const d of selectedDomains) {
      try {
        await onRefreshValuation(d);
        done++;
      } catch { /* continue */ }
    }
    toast.success(`${done} expiry date${done !== 1 ? "s" : ""} refreshed`);
    setRefreshingBulk(false);
  };

  const handleExportCSV = () => {
    const exportDomains = selected.size > 0
      ? domains.filter((d) => selected.has(d.id))
      : domains;

    const headers = ["Domain", "TLD", "Length", "Status", "Purchase Price", "List Price", "Valuation", "P&L", "Sale Price", "Expires", "Renewal Cost", "Days Held", "Tags", "Nameservers", "Notes", "Purchase Date", "Purchase Source"];
    const rows = exportDomains.map((d) => {
      const p = d.status === "sold"
        ? (d.sale_price ?? 0) - Number(d.purchase_price)
        : (d.auto_valuation ?? 0) - Number(d.purchase_price);
      const expiry = getExpiryDate(d);
      return [
        d.domain_name,
        d.tld ?? "",
        String(getDomainLength(d.domain_name)),
        d.status,
        String(Number(d.purchase_price)),
        d.list_price != null ? String(d.list_price) : "",
        d.auto_valuation != null ? String(d.auto_valuation) : "",
        String(p),
        d.sale_price != null ? String(d.sale_price) : "",
        expiry ?? "",
        String(Number(d.renewal_cost_yearly) || getLiveRenewal(d.domain_name)),
        String(getDaysHeld(d.purchase_date) ?? ""),
        (d.tags ?? []).join("; "),
        (d.nameservers ?? []).join("; "),
        d.notes ?? "",
        d.purchase_date ?? "",
        d.purchase_source ?? "",
      ].map(csvEscape);
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportDomains.length} domains to CSV`);
  };

  const updateField = useCallback((id: string, field: string, value: any) => {
    return onUpdate(id, { [field]: value });
  }, [onUpdate]);

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No domains in your portfolio yet. Add one to get started!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-1 flex-wrap">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          {confirmBulkDelete ? (
            <>
              <span className="text-sm font-medium text-destructive">Delete {selected.size} domain{selected.size !== 1 ? "s" : ""}?</span>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDeleteSelected} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmBulkDelete(false)} disabled={deleting}>Cancel</Button>
            </>
          ) : (
            <>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setConfirmBulkDelete(true)}>
                <Trash2 className="w-3.5 h-3.5" />Delete {selected.size}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleBulkRefreshRenewals}
                disabled={refreshingBulk}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingBulk ? "animate-spin" : ""}`} />
                {refreshingBulk ? "Refreshing..." : "Refresh Renewals"}
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 className="gap-1.5"
                 onClick={async () => {
                   const names = domains.filter((d) => selected.has(d.id)).map((d) => d.domain_name);
                   if (names.length === 0) return;
                   setLookingUpNS(true);
                   await onLookupNameservers(names);
                   setLookingUpNS(false);
                 }}
                 disabled={lookingUpNS}
               >
                 <Server className={`w-3.5 h-3.5 ${lookingUpNS ? "animate-spin" : ""}`} />
                 {lookingUpNS ? "Looking up..." : "Refresh NS"}
               </Button>
               <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-3 w-10">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition-colors">
                  {allSelected ? <CheckSquare className="w-4 h-4" /> : someSelected ? <MinusSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-4 py-3"><SortableHeader label="Domain" sortKey="domain" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-3 text-center"><SortableHeader label="Len" sortKey="length" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" /></th>
              <th className="px-4 py-3"><SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></th>
              <th className="px-4 py-3"><SortableHeader label="Cost" sortKey="cost" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-4 py-3"><SortableHeader label="List Price" sortKey="list_price" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-4 py-3"><SortableHeader label="Current Value" sortKey="value" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-4 py-3"><SortableHeader label="P&L" sortKey="pnl" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-4 py-3"><SortableHeader label="Sale Price" sortKey="sale_price" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-4 py-3"><SortableHeader label="Expires" sortKey="expires" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" /></th>
              <th className="px-4 py-3"><SortableHeader label="Renewal" sortKey="renewal" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" /></th>
              <th className="px-3 py-3"><SortableHeader label="Held" sortKey="held" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" /></th>
              <th className="px-4 py-3"><SortableHeader label="Tags" sortKey="tags" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></th>
              <th className="px-4 py-3"><SortableHeader label="Nameservers" sortKey="nameservers" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDomains.map((d) => {
              const p = d.status === "sold"
                ? pnl(d.sale_price, Number(d.purchase_price))
                : pnl(d.auto_valuation, Number(d.purchase_price));
              const status = STATUS_MAP[d.status] ?? STATUS_MAP.holding;
              const domainLen = getDomainLength(d.domain_name);
              const daysHeld = getDaysHeld(d.purchase_date);
              const liveRenewal = getLiveRenewal(d.domain_name);
              const displayRenewal = Number(d.renewal_cost_yearly) || liveRenewal;

              return (
                <tr key={d.id} className={`border-t border-border/50 transition-colors ${selected.has(d.id) ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                  {/* Checkbox */}
                  <td className="px-3 py-3">
                    <button onClick={() => toggleOne(d.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {selected.has(d.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>

                  {/* Domain */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/tools?domain=${encodeURIComponent(d.domain_name)}`}
                        className="font-medium text-foreground hover:text-primary flex items-center gap-1"
                      >
                        {d.domain_name}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                      {d.notes && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <StickyNote className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                              <p className="text-xs">{d.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <InlineTextCell
                      value={d.notes}
                      onSave={(val) => updateField(d.id, "notes", val)}
                      placeholder="Add notes..."
                    />
                  </td>

                  {/* Length */}
                  <td className="px-3 py-3 text-center">
                    <span className={`font-mono text-xs ${domainLen <= 5 ? "text-green-500 font-semibold" : domainLen <= 8 ? "text-foreground" : "text-muted-foreground"}`}>
                      {domainLen}
                    </span>
                  </td>

                  {/* Status - inline select */}
                  <td className="px-4 py-3">
                    <Select value={d.status} onValueChange={(v) => updateField(d.id, "status", v)}>
                      <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent px-0 hover:bg-muted/50">
                        <Badge variant={status.variant} className="cursor-pointer">{status.label}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="holding">Holding</SelectItem>
                        <SelectItem value="listed">Listed</SelectItem>
                        <SelectItem value="developing">Developing</SelectItem>
                        <SelectItem value="parked">Parked</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Cost - inline edit */}
                  <td className="px-4 py-3 text-right">
                    <InlineEditCell
                      value={Number(d.purchase_price)}
                      onSave={(val) => updateField(d.id, "purchase_price", val ?? 0)}
                    />
                  </td>

                  {/* List Price - inline edit */}
                  <td className="px-4 py-3 text-right">
                    <InlineEditCell
                      value={d.list_price}
                      onSave={(val) => updateField(d.id, "list_price", val)}
                      allowNull
                      placeholder="Set price"
                    />
                  </td>

                  {/* Current Value */}
                  <td className="px-4 py-3 text-right font-mono">
                    {d.status === "sold" ? "-" : fmt(d.auto_valuation)}
                    {(() => {
                      const roiWarn = renewalRoiWarning(d);
                      if (!roiWarn) return null;
                      return (
                        <p className={`text-[10px] mt-0.5 font-medium ${roiWarn.color}`}>
                          {roiWarn.label}
                        </p>
                      );
                    })()}
                  </td>

                  {/* P&L */}
                  <td className={`px-4 py-3 text-right font-mono ${p.color}`}>{p.value}</td>

                  {/* Sale Price - inline edit */}
                  <td className="px-4 py-3 text-right">
                    <InlineEditCell
                      value={d.sale_price}
                      onSave={(val) => updateField(d.id, "sale_price", val)}
                      allowNull
                      placeholder="Sale $"
                    />
                  </td>

                  {/* Expires */}
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const expiry = getExpiryDate(d);
                      if (d.status === "sold") return <span className="text-muted-foreground text-xs">-</span>;
                      if (!expiry) return <span className="text-muted-foreground/40 text-xs">-</span>;
                      const daysLeft = differenceInDays(parseISO(expiry), new Date());
                      const colorClass = daysLeft < 0
                        ? "text-destructive font-semibold"
                        : daysLeft <= 7
                        ? "text-destructive"
                        : daysLeft <= 30
                        ? "text-yellow-500"
                        : "text-muted-foreground";
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs font-mono ${colorClass}`}>
                            {formatExpiryDate(expiry)}
                          </span>
                          {daysLeft <= 30 && (
                            <span className={`text-[10px] ${colorClass}`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Renewal - with live TLD pricing */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="text-right">
                        <InlineEditCell
                          value={displayRenewal}
                          onSave={(val) => updateField(d.id, "renewal_cost_yearly", val ?? 0)}
                          subtext={
                            Number(d.renewal_cost_yearly) === 0 ? (
                              <p className="text-[10px] text-muted-foreground/60 font-normal">
                                auto ({d.tld ?? "com"})
                              </p>
                            ) : null
                          }
                        />
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
                  </td>

                  {/* Days Held */}
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDaysHeld(daysHeld)}
                    </span>
                  </td>

                  {/* Tags - inline */}
                  <td className="px-4 py-3">
                    <InlineTextCell
                      value={(d.tags ?? []).join(", ")}
                      onSave={(val) => updateField(d.id, "tags", val ? val.split(",").map((t) => t.trim()).filter(Boolean) : [])}
                      placeholder="Add tags..."
                    />
                  </td>

                  {/* Nameservers */}
                  <td className="px-4 py-3">
                    {d.nameservers && d.nameservers.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {d.nameservers.map((ns, i) => (
                          <span key={i} className="text-xs text-muted-foreground font-mono truncate max-w-[180px]" title={ns}>
                            {ns}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground/40 hover:text-primary transition-colors"
                        onClick={async () => {
                          setLookingUpNS(true);
                          await onLookupNameservers([d.domain_name]);
                          setLookingUpNS(false);
                        }}
                        title="Look up nameservers"
                      >
                        Look up
                      </button>
                    )}
                  </td>

                  {/* Actions - simplified */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onDelete(d.id)}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
