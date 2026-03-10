import { useState, useMemo } from "react";
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface MatchesFilters {
  tlds: string[];
  sources: string[];
  patterns: string[];
  wordCounts: number[];
  priceRange: string;
  minLength: number | null;
  maxLength: number | null;
  noNumbers: boolean;
  noHyphens: boolean;
  hideEnded: boolean;
}

export const DEFAULT_MATCHES_FILTERS: MatchesFilters = {
  tlds: [],
  sources: [],
  patterns: [],
  wordCounts: [],
  priceRange: "any",
  minLength: null,
  maxLength: null,
  noNumbers: false,
  noHyphens: false,
  hideEnded: true,
};

interface MatchDomain {
  domain_name: string;
  price: number;
  end_time: string | null;
  pattern_description: string;
  tld?: string;
  inventory_source?: string;
  domain_age?: number;
  [key: string]: any;
}

interface MatchesFilterPanelProps {
  matches: MatchDomain[];
  filters: MatchesFilters;
  onFiltersChange: (filters: MatchesFilters) => void;
  onReset: () => void;
  activeFilterCount: number;
}

const PRICE_RANGES = [
  { label: "Any", value: "any", min: 0, max: Infinity },
  { label: "Under $25", value: "under25", min: 0, max: 25 },
  { label: "$25–$100", value: "25-100", min: 25, max: 100 },
  { label: "$100–$500", value: "100-500", min: 100, max: 500 },
  { label: "$500–$5K", value: "500-5000", min: 500, max: 5000 },
  { label: "$5K+", value: "5000+", min: 5000, max: Infinity },
];

function getWordCount(domainName: string): number {
  const sld = domainName.split(".")[0].toLowerCase();
  // Simple heuristic: split on hyphens, then try to detect camelCase/compound words
  const parts = sld.split("-");
  if (parts.length > 1) return parts.length;
  // Count transitions from consonant to vowel as word boundaries (rough heuristic)
  const words = sld.replace(/([a-z])([A-Z])/g, "$1 $2").split(/(?<=[aeiou])(?=[bcdfghjklmnpqrstvwxyz]{2})/i);
  // Simplified: just count by common patterns
  if (sld.length <= 5) return 1;
  if (sld.length <= 10) return 2;
  return 3;
}

function getSLD(domainName: string): string {
  return domainName.split(".")[0];
}

function hasNumbers(domainName: string): boolean {
  return /\d/.test(domainName.split(".")[0]);
}

function hasHyphens(domainName: string): boolean {
  return domainName.split(".")[0].includes("-");
}

function ChipButton({
  label,
  count,
  active,
  onClick,
  color = "default",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: "default" | "green" | "blue" | "amber" | "purple" | "rose" | "teal" | "orange";
}) {
  const colorMap = {
    default: active
      ? "bg-primary text-primary-foreground border-primary shadow-sm"
      : "bg-muted/50 text-foreground border-border hover:bg-muted hover:border-muted-foreground/30",
    green: active
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
    blue: active
      ? "bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
    amber: active
      ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30",
    purple: active
      ? "bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30",
    rose: active
      ? "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30",
    teal: active
      ? "bg-teal-500/15 text-teal-400 border-teal-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-teal-500/10 hover:text-teal-400 hover:border-teal-500/30",
    orange: active
      ? "bg-orange-500/15 text-orange-400 border-orange-500/40 shadow-sm"
      : "bg-muted/50 text-muted-foreground border-border hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30",
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        border transition-all duration-150 cursor-pointer select-none
        ${colorMap[color]}
      `}
    >
      {label}
      <span className={`text-xs font-semibold ${active ? 'opacity-90' : 'opacity-60'}`}>
        {count}
      </span>
    </button>
  );
}

export function MatchesFilterPanel({
  matches,
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
}: MatchesFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Compute stats from ALL matches (not filtered)
  const stats = useMemo(() => {
    const tldCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const patternCounts: Record<string, number> = {};
    const wordCountCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let withNumbers = 0;
    let withHyphens = 0;
    const priceCounts: Record<string, number> = {};

    PRICE_RANGES.forEach(r => { priceCounts[r.value] = 0; });

    matches.forEach((m) => {
      const tld = (m.tld || "." + m.domain_name.split(".").pop()).toLowerCase();
      tldCounts[tld] = (tldCounts[tld] || 0) + 1;

      const source = m.inventory_source || "unknown";
      const sourceLabel = source === "namecheap" ? "Namecheap" : source === "godaddy" || source === "GoDaddy" ? "GoDaddy" : source.charAt(0).toUpperCase() + source.slice(1);
      sourceCounts[sourceLabel] = (sourceCounts[sourceLabel] || 0) + 1;

      const pattern = m.pattern_description || "Unknown";
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;

      const wc = Math.min(getWordCount(m.domain_name), 3);
      wordCountCounts[wc] = (wordCountCounts[wc] || 0) + 1;

      if (hasNumbers(m.domain_name)) withNumbers++;
      if (hasHyphens(m.domain_name)) withHyphens++;

      PRICE_RANGES.forEach((r) => {
        if (r.value === "any") {
          priceCounts[r.value] = matches.length;
        } else if (m.price >= r.min && m.price < r.max) {
          priceCounts[r.value]++;
        }
      });
    });

    return {
      tldCounts,
      sourceCounts,
      patternCounts,
      wordCountCounts,
      withNumbers,
      withHyphens,
      withoutNumbers: matches.length - withNumbers,
      withoutHyphens: matches.length - withHyphens,
      priceCounts,
    };
  }, [matches]);

  const toggleArrayFilter = (
    key: "tlds" | "sources" | "patterns",
    value: string
  ) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const toggleWordCount = (wc: number) => {
    const current = filters.wordCounts;
    const next = current.includes(wc)
      ? current.filter((v) => v !== wc)
      : [...current, wc];
    onFiltersChange({ ...filters, wordCounts: next });
  };

  const sortedTlds = Object.entries(stats.tldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const sortedSources = Object.entries(stats.sourceCounts)
    .sort((a, b) => b[1] - a[1]);

  const sortedPatterns = Object.entries(stats.patternCounts)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mb-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Smart Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReset();
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-5">
            {/* TLD Section */}
            {sortedTlds.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    TLD Extension
                  </h4>
                  {filters.tlds.length > 0 && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onFiltersChange({ ...filters, tlds: [] })}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedTlds.map(([tld, count]) => (
                    <ChipButton
                      key={tld}
                      label={tld}
                      count={count}
                      active={filters.tlds.includes(tld)}
                      onClick={() => toggleArrayFilter("tlds", tld)}
                      color="green"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Source Section */}
            {sortedSources.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Marketplace
                  </h4>
                  {filters.sources.length > 0 && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onFiltersChange({ ...filters, sources: [] })}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedSources.map(([source, count]) => (
                    <ChipButton
                      key={source}
                      label={source}
                      count={count}
                      active={filters.sources.includes(source)}
                      onClick={() => toggleArrayFilter("sources", source)}
                      color="blue"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pattern Section */}
            {sortedPatterns.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pattern
                  </h4>
                  {filters.patterns.length > 0 && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onFiltersChange({ ...filters, patterns: [] })}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedPatterns.map(([pattern, count]) => (
                    <ChipButton
                      key={pattern}
                      label={pattern.length > 30 ? pattern.slice(0, 28) + "…" : pattern}
                      count={count}
                      active={filters.patterns.includes(pattern)}
                      onClick={() => toggleArrayFilter("patterns", pattern)}
                      color="purple"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Price Range
              </h4>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range) => (
                  <ChipButton
                    key={range.value}
                    label={range.label}
                    count={stats.priceCounts[range.value] || 0}
                    active={filters.priceRange === range.value}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        priceRange: filters.priceRange === range.value ? "any" : range.value,
                      })
                    }
                    color="amber"
                  />
                ))}
              </div>
            </div>

            {/* Word Count */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Word Count
              </h4>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((wc) => (
                  <ChipButton
                    key={wc}
                    label={wc === 3 ? "3+ Word" : `${wc}-Word`}
                    count={stats.wordCountCounts[wc] || 0}
                    active={filters.wordCounts.includes(wc)}
                    onClick={() => toggleWordCount(wc)}
                    color="orange"
                  />
                ))}
              </div>
            </div>

            {/* SLD Length */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                SLD Length
              </h4>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minLength ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minLength: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-20 h-8 text-xs bg-background"
                  min={1}
                  max={63}
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxLength ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxLength: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-20 h-8 text-xs bg-background"
                  min={1}
                  max={63}
                />
              </div>
            </div>

            {/* Toggles */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Filters
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="no-numbers"
                    checked={filters.noNumbers}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, noNumbers: checked })
                    }
                  />
                  <Label htmlFor="no-numbers" className="text-xs cursor-pointer">
                    No Numbers
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="no-hyphens"
                    checked={filters.noHyphens}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, noHyphens: checked })
                    }
                  />
                  <Label htmlFor="no-hyphens" className="text-xs cursor-pointer">
                    No Hyphens
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="hide-ended"
                    checked={filters.hideEnded}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, hideEnded: checked })
                    }
                  />
                  <Label htmlFor="hide-ended" className="text-xs cursor-pointer">
                    Hide Ended
                  </Label>
                </div>
              </div>
            </div>

            {/* Active filter summary chips */}
            {activeFilterCount > 0 && (
              <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
                {filters.tlds.map((tld) => (
                  <Badge key={tld} variant="secondary" className="flex items-center gap-1 text-xs">
                    {tld}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleArrayFilter("tlds", tld)}
                    />
                  </Badge>
                ))}
                {filters.sources.map((src) => (
                  <Badge key={src} variant="secondary" className="flex items-center gap-1 text-xs">
                    {src}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleArrayFilter("sources", src)}
                    />
                  </Badge>
                ))}
                {filters.patterns.map((p) => (
                  <Badge key={p} variant="secondary" className="flex items-center gap-1 text-xs">
                    {p.length > 20 ? p.slice(0, 18) + "…" : p}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleArrayFilter("patterns", p)}
                    />
                  </Badge>
                ))}
                {filters.priceRange !== "any" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    {PRICE_RANGES.find((r) => r.value === filters.priceRange)?.label}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => onFiltersChange({ ...filters, priceRange: "any" })}
                    />
                  </Badge>
                )}
                {filters.wordCounts.map((wc) => (
                  <Badge key={wc} variant="secondary" className="flex items-center gap-1 text-xs">
                    {wc === 3 ? "3+" : wc}-word
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleWordCount(wc)} />
                  </Badge>
                ))}
                {(filters.minLength || filters.maxLength) && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    {filters.minLength && filters.maxLength
                      ? `${filters.minLength}–${filters.maxLength} chars`
                      : filters.maxLength
                        ? `≤${filters.maxLength} chars`
                        : `≥${filters.minLength} chars`}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => onFiltersChange({ ...filters, minLength: null, maxLength: null })}
                    />
                  </Badge>
                )}
                {filters.noNumbers && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    No numbers
                    <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, noNumbers: false })} />
                  </Badge>
                )}
                {filters.noHyphens && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    No hyphens
                    <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, noHyphens: false })} />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Apply matches filters to a list of match domains */
export function applyMatchesFilters(
  matches: MatchDomain[],
  filters: MatchesFilters
): MatchDomain[] {
  return matches.filter((m) => {
    // TLD filter
    if (filters.tlds.length > 0) {
      const tld = (m.tld || "." + m.domain_name.split(".").pop()).toLowerCase();
      if (!filters.tlds.includes(tld)) return false;
    }

    // Source filter
    if (filters.sources.length > 0) {
      const source = m.inventory_source || "unknown";
      const sourceLabel = source === "namecheap" ? "Namecheap" : source === "godaddy" || source === "GoDaddy" ? "GoDaddy" : source.charAt(0).toUpperCase() + source.slice(1);
      if (!filters.sources.includes(sourceLabel)) return false;
    }

    // Pattern filter
    if (filters.patterns.length > 0) {
      const pattern = m.pattern_description || "Unknown";
      if (!filters.patterns.includes(pattern)) return false;
    }

    // Price range
    if (filters.priceRange !== "any") {
      const range = PRICE_RANGES.find((r) => r.value === filters.priceRange);
      if (range && (m.price < range.min || m.price >= range.max)) return false;
    }

    // Word count
    if (filters.wordCounts.length > 0) {
      const wc = Math.min(getWordCount(m.domain_name), 3);
      if (!filters.wordCounts.includes(wc)) return false;
    }

    // SLD length
    const sld = getSLD(m.domain_name);
    if (filters.minLength && sld.length < filters.minLength) return false;
    if (filters.maxLength && sld.length > filters.maxLength) return false;

    // No numbers
    if (filters.noNumbers && hasNumbers(m.domain_name)) return false;

    // No hyphens
    if (filters.noHyphens && hasHyphens(m.domain_name)) return false;

    return true;
  });
}
