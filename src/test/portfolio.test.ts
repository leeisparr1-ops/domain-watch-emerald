import { describe, it, expect } from "vitest";
import { differenceInDays, parseISO, addDays, subDays, format } from "date-fns";

// ---- Re-implement pure functions from portfolio components for unit testing ----

// From PortfolioTable.tsx
function renewalWarning(d: { next_renewal_date: string | null; status: string }) {
  if (!d.next_renewal_date || d.status === "sold") return null;
  const days = differenceInDays(parseISO(d.next_renewal_date), new Date());
  if (days < 0) return { level: "expired" as const, days, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { level: "critical" as const, days, label: `Expires in ${days}d` };
  if (days <= 30) return { level: "warning" as const, days, label: `Expires in ${days}d` };
  return null;
}

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

// From BulkImportDialog.tsx - CSV parser
function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("domain") || firstLine.includes("name") || firstLine.includes("price");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let colMap = { domain: 0, price: -1, date: -1, source: -1, status: -1, renewal: -1, tags: -1 };
  if (hasHeader) {
    const headers = firstLine.split(/[,\t;|]/).map((h) => h.trim().replace(/"/g, ""));
    headers.forEach((h, i) => {
      if (/domain|name/i.test(h)) colMap.domain = i;
      else if (/price|cost|paid/i.test(h) && !/renewal/i.test(h)) colMap.price = i;
      else if (/date|purchased|acquired/i.test(h)) colMap.date = i;
      else if (/source|registrar|platform/i.test(h)) colMap.source = i;
      else if (/status/i.test(h)) colMap.status = i;
      else if (/renewal/i.test(h)) colMap.renewal = i;
      else if (/tag/i.test(h)) colMap.tags = i;
    });
  }

  return dataLines
    .map((line) => {
      const cols = line.split(/[,\t;|]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const domain = cols[colMap.domain]?.trim().toLowerCase();
      if (!domain || !domain.includes(".")) return null;

      const row: any = { domain_name: domain };
      if (colMap.price >= 0 && cols[colMap.price]) row.purchase_price = parseFloat(cols[colMap.price]) || 0;
      if (colMap.date >= 0 && cols[colMap.date]) row.purchase_date = cols[colMap.date];
      if (colMap.source >= 0 && cols[colMap.source]) row.purchase_source = cols[colMap.source];
      if (colMap.status >= 0 && cols[colMap.status]) row.status = cols[colMap.status].toLowerCase();
      if (colMap.renewal >= 0 && cols[colMap.renewal]) row.renewal_cost_yearly = parseFloat(cols[colMap.renewal]) || 0;
      if (colMap.tags >= 0 && cols[colMap.tags]) row.tags = cols[colMap.tags].split(/[,;]/).map((t: string) => t.trim()).filter(Boolean);
      return row;
    })
    .filter(Boolean);
}

function parsePlainList(text: string) {
  return text
    .trim()
    .split(/[\n,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes(".") && s.length > 3)
    .map((domain_name) => ({ domain_name }));
}

// Stats calculation (from usePortfolio.ts)
function computeStats(domains: Array<{
  status: string;
  purchase_price: number;
  auto_valuation: number | null;
  sale_price: number | null;
  renewal_cost_yearly: number;
  next_renewal_date: string | null;
}>) {
  const holding = domains.filter((d) => d.status !== "sold");
  const sold = domains.filter((d) => d.status === "sold");

  const totalInvested = domains.reduce((s, d) => s + Number(d.purchase_price), 0);
  const totalCurrentValue = holding.reduce((s, d) => s + (Number(d.auto_valuation) || 0), 0);
  const totalRenewalCosts = holding.reduce((s, d) => s + Number(d.renewal_cost_yearly), 0);
  const totalSaleRevenue = sold.reduce((s, d) => s + (Number(d.sale_price) || 0), 0);
  const soldCostBasis = sold.reduce((s, d) => s + Number(d.purchase_price), 0);
  const realizedPnL = totalSaleRevenue - soldCostBasis;
  const holdingCostBasis = holding.reduce((s, d) => s + Number(d.purchase_price), 0);
  const unrealizedPnL = totalCurrentValue - holdingCostBasis;
  const expiringSoon = holding.filter((d) => {
    if (!d.next_renewal_date) return false;
    const days = differenceInDays(parseISO(d.next_renewal_date), new Date());
    return days <= 30;
  }).length;
  const overallROI = totalInvested > 0 ? ((realizedPnL + unrealizedPnL) / totalInvested) * 100 : 0;

  return {
    totalDomains: domains.length,
    totalInvested,
    totalCurrentValue,
    totalRenewalCosts,
    totalSold: sold.length,
    totalSaleRevenue,
    realizedPnL,
    unrealizedPnL,
    expiringSoon,
    overallROI,
  };
}

// ==================== TESTS ====================

describe("Portfolio — renewalWarning", () => {
  it("returns null for domains without renewal date", () => {
    expect(renewalWarning({ next_renewal_date: null, status: "holding" })).toBeNull();
  });

  it("returns null for sold domains even if expiring", () => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    expect(renewalWarning({ next_renewal_date: tomorrow, status: "sold" })).toBeNull();
  });

  it("returns null for domains expiring in > 30 days", () => {
    const future = format(addDays(new Date(), 60), "yyyy-MM-dd");
    expect(renewalWarning({ next_renewal_date: future, status: "holding" })).toBeNull();
  });

  it("returns 'warning' for domains expiring in 8-30 days", () => {
    const date = format(addDays(new Date(), 15), "yyyy-MM-dd");
    const result = renewalWarning({ next_renewal_date: date, status: "holding" });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.label).toContain("Expires in");
  });

  it("returns 'critical' for domains expiring in 0-7 days", () => {
    const date = format(addDays(new Date(), 3), "yyyy-MM-dd");
    const result = renewalWarning({ next_renewal_date: date, status: "holding" });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("critical");
  });

  it("returns 'expired' for domains past renewal date", () => {
    const date = format(subDays(new Date(), 5), "yyyy-MM-dd");
    const result = renewalWarning({ next_renewal_date: date, status: "holding" });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("expired");
    expect(result!.label).toContain("Expired");
    expect(result!.label).toContain("5d ago");
  });

  it("returns 'critical' for domains expiring today (0 days)", () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const result = renewalWarning({ next_renewal_date: today, status: "holding" });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("critical");
  });

  it("handles edge case at exactly 30 days", () => {
    const date = format(addDays(new Date(), 30), "yyyy-MM-dd");
    const result = renewalWarning({ next_renewal_date: date, status: "holding" });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
  });

  it("returns null at 32 days out", () => {
    const date = format(addDays(new Date(), 32), "yyyy-MM-dd");
    expect(renewalWarning({ next_renewal_date: date, status: "holding" })).toBeNull();
  });
});

describe("Portfolio — fmt", () => {
  it("formats null as dash", () => {
    expect(fmt(null)).toBe("-");
  });

  it("formats zero", () => {
    expect(fmt(0)).toBe("$0");
  });

  it("formats positive numbers with commas", () => {
    expect(fmt(1500)).toBe("$1,500");
  });

  it("formats large numbers", () => {
    expect(fmt(1000000)).toBe("$1,000,000");
  });
});

describe("Portfolio — pnl", () => {
  it("returns dash for null current value", () => {
    const result = pnl(null, 100);
    expect(result.value).toBe("-");
    expect(result.color).toBe("");
  });

  it("shows positive P&L in green", () => {
    const result = pnl(200, 100);
    expect(result.color).toBe("text-green-500");
    expect(result.value).toContain("+");
    expect(result.value).toContain("100%");
  });

  it("shows negative P&L in destructive", () => {
    const result = pnl(50, 100);
    expect(result.color).toBe("text-destructive");
    expect(result.value).toContain("-50%");
  });

  it("handles zero cost (infinity)", () => {
    const result = pnl(100, 0);
    expect(result.value).toContain("∞");
  });

  it("handles break-even", () => {
    const result = pnl(100, 100);
    expect(result.color).toBe("text-green-500");
    expect(result.value).toContain("+$0");
    expect(result.value).toContain("0%");
  });
});

describe("Portfolio — CSV parser", () => {
  it("parses simple domain list with header", () => {
    const csv = "domain,price,source\nexample.com,50,GoDaddy\ntest.io,120,Namecheap";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].domain_name).toBe("example.com");
    expect(rows[0].purchase_price).toBe(50);
    expect(rows[0].purchase_source).toBe("GoDaddy");
    expect(rows[1].domain_name).toBe("test.io");
  });

  it("parses tab-delimited data", () => {
    const csv = "domain\tprice\nexample.com\t100";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].purchase_price).toBe(100);
  });

  it("parses semicolon-delimited data", () => {
    const csv = "domain;price\nexample.com;200";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].purchase_price).toBe(200);
  });

  it("skips lines without a valid domain (no dot)", () => {
    const csv = "domain,price\nexample.com,50\nnotadomain,100\ntest.io,75";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
  });

  it("handles data without header", () => {
    const csv = "example.com,50\ntest.io,100";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    // Without header, only first column (domain) is mapped
    expect(rows[0].domain_name).toBe("example.com");
  });

  it("parses status column", () => {
    const csv = "domain,price,status\nexample.com,50,Listed";
    const rows = parseCSV(csv);
    expect(rows[0].status).toBe("listed");
  });

  it("parses renewal column", () => {
    const csv = "domain,renewal\nexample.com,12";
    const rows = parseCSV(csv);
    expect(rows[0].renewal_cost_yearly).toBe(12);
  });

  it("returns empty for empty input", () => {
    expect(parseCSV("")).toHaveLength(0);
    expect(parseCSV("   \n\n  ")).toHaveLength(0);
  });

  it("handles quoted values", () => {
    const csv = 'domain,price\n"example.com","50"';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].domain_name).toBe("example.com");
    expect(rows[0].purchase_price).toBe(50);
  });
});

describe("Portfolio — plain list parser", () => {
  it("parses newline-separated domains", () => {
    const text = "example.com\ntest.io\nhello.org";
    const rows = parsePlainList(text);
    expect(rows).toHaveLength(3);
  });

  it("filters out short strings and strings without dots", () => {
    const text = "ok\na.b\nexample.com";
    const rows = parsePlainList(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].domain_name).toBe("example.com");
  });

  it("handles space-separated domains", () => {
    const text = "example.com test.io hello.org";
    const rows = parsePlainList(text);
    expect(rows).toHaveLength(3);
  });

  it("lowercases domains", () => {
    const text = "EXAMPLE.COM";
    const rows = parsePlainList(text);
    expect(rows[0].domain_name).toBe("example.com");
  });
});

describe("Portfolio — stats computation", () => {
  const mkDomain = (overrides: Partial<{
    status: string; purchase_price: number; auto_valuation: number | null;
    sale_price: number | null; renewal_cost_yearly: number; next_renewal_date: string | null;
  }> = {}) => ({
    status: "holding",
    purchase_price: 100,
    auto_valuation: 150,
    sale_price: null,
    renewal_cost_yearly: 10,
    next_renewal_date: null,
    ...overrides,
  });

  it("computes basic stats for a single holding domain", () => {
    const stats = computeStats([mkDomain()]);
    expect(stats.totalDomains).toBe(1);
    expect(stats.totalInvested).toBe(100);
    expect(stats.totalCurrentValue).toBe(150);
    expect(stats.unrealizedPnL).toBe(50);
    expect(stats.realizedPnL).toBe(0);
    expect(stats.totalRenewalCosts).toBe(10);
    expect(stats.totalSold).toBe(0);
  });

  it("computes realized P&L for sold domains", () => {
    const stats = computeStats([mkDomain({ status: "sold", purchase_price: 100, sale_price: 300 })]);
    expect(stats.realizedPnL).toBe(200);
    expect(stats.totalSold).toBe(1);
    expect(stats.totalSaleRevenue).toBe(300);
  });

  it("excludes sold domains from current value and renewals", () => {
    const stats = computeStats([
      mkDomain({ status: "sold", purchase_price: 50, sale_price: 200, renewal_cost_yearly: 10, auto_valuation: 999 }),
    ]);
    expect(stats.totalCurrentValue).toBe(0);
    expect(stats.totalRenewalCosts).toBe(0);
  });

  it("computes ROI correctly", () => {
    const stats = computeStats([
      mkDomain({ purchase_price: 100, auto_valuation: 200 }),
    ]);
    expect(stats.overallROI).toBe(100); // 100% ROI
  });

  it("returns 0% ROI for zero investment", () => {
    const stats = computeStats([mkDomain({ purchase_price: 0, auto_valuation: 100 })]);
    expect(stats.overallROI).toBe(0);
  });

  it("counts expiring domains within 30 days", () => {
    const soon = format(addDays(new Date(), 10), "yyyy-MM-dd");
    const later = format(addDays(new Date(), 60), "yyyy-MM-dd");
    const stats = computeStats([
      mkDomain({ next_renewal_date: soon }),
      mkDomain({ next_renewal_date: later }),
      mkDomain({ next_renewal_date: null }),
    ]);
    expect(stats.expiringSoon).toBe(1);
  });

  it("does not count sold domains as expiring", () => {
    const soon = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const stats = computeStats([
      mkDomain({ status: "sold", next_renewal_date: soon, sale_price: 100 }),
    ]);
    expect(stats.expiringSoon).toBe(0);
  });

  it("handles mixed portfolio correctly", () => {
    const stats = computeStats([
      mkDomain({ purchase_price: 100, auto_valuation: 200 }), // holding, +100 unrealized
      mkDomain({ purchase_price: 50, auto_valuation: 30 }),    // holding, -20 unrealized
      mkDomain({ status: "sold", purchase_price: 80, sale_price: 250 }), // +170 realized
    ]);
    expect(stats.totalDomains).toBe(3);
    expect(stats.totalInvested).toBe(230);
    expect(stats.totalCurrentValue).toBe(230); // 200 + 30
    expect(stats.unrealizedPnL).toBe(80);      // (200+30) - (100+50)
    expect(stats.realizedPnL).toBe(170);       // 250 - 80
    expect(stats.totalSold).toBe(1);
  });

  it("handles empty portfolio", () => {
    const stats = computeStats([]);
    expect(stats.totalDomains).toBe(0);
    expect(stats.overallROI).toBe(0);
    expect(stats.expiringSoon).toBe(0);
  });
});
