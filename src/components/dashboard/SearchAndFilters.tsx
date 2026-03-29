import { useState } from "react";
import { Search, Filter, ArrowUpDown, X, Loader2, Save, Bookmark, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface Filters {
  tld: string;
  auctionType: string;
  minPrice: number;
  maxPrice: number;
  inventorySource: string;
}

interface SortOption {
  value: string;
  label: string;
  column: string;
  ascending: boolean;
}

const TLD_OPTIONS = [
  { value: "all", label: "All TLDs" },
  { value: ".com", label: ".com" },
  { value: ".net", label: ".net" },
  { value: ".org", label: ".org" },
  { value: ".io", label: ".io" },
  { value: ".co", label: ".co" },
  { value: ".ai", label: ".ai" },
  { value: ".xyz", label: ".xyz" },
  { value: ".info", label: ".info" },
  { value: ".dev", label: ".dev" },
  { value: ".app", label: ".app" },
  { value: ".me", label: ".me" },
];

const AUCTION_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "bid", label: "Bid" },
  { value: "buynow", label: "Buy Now" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "godaddy", label: "GoDaddy" },
  { value: "namecheap", label: "Namecheap" },
];

const PRICE_PRESETS = [
  { label: "Any", min: 0, max: 1000000 },
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50–$500", min: 50, max: 500 },
  { label: "$500–$5K", min: 500, max: 5000 },
  { label: "$5K+", min: 5000, max: 1000000 },
];

export const SORT_OPTIONS: SortOption[] = [
  { value: "end_time_asc", label: "Ending Soon", column: "end_time", ascending: true },
  { value: "end_time_desc", label: "Ending Last", column: "end_time", ascending: false },
  { value: "price_asc", label: "Price: Low to High", column: "price", ascending: true },
  { value: "price_desc", label: "Price: High to Low", column: "price", ascending: false },
  { value: "traffic_desc", label: "Demand: High to Low", column: "traffic_count", ascending: false },
  { value: "traffic_asc", label: "Demand: Low to High", column: "traffic_count", ascending: true },
];

interface SearchAndFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (updater: (prev: Filters) => Filters) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
  onPageReset: () => void;
  isSearching?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onExportCsv?: () => void;
}

interface SavedPreset {
  name: string;
  filters: Filters;
  sortBy: string;
}

const PRESETS_KEY = "eh_filter_presets";

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: SavedPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

/** Reusable chip button matching the MatchesFilterPanel style */
function ChipButton({
  label,
  active,
  onClick,
  color = "default",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: "default" | "green" | "blue" | "amber" | "purple" | "rose" | "teal" | "orange";
}) {
  const colorMap = {
    default: active
      ? "bg-primary/20 text-primary border-primary/50 shadow-sm ring-1 ring-primary/20"
      : "bg-muted/60 text-foreground border-border/60 hover:bg-muted hover:border-muted-foreground/30",
    green: active
      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/15",
    blue: active
      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 shadow-sm ring-1 ring-blue-500/20"
      : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/15",
    amber: active
      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-sm ring-1 ring-amber-500/20"
      : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15",
    purple: active
      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 shadow-sm ring-1 ring-purple-500/20"
      : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/15",
    rose: active
      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-sm ring-1 ring-rose-500/20"
      : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/15",
    teal: active
      ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/50 shadow-sm ring-1 ring-teal-500/20"
      : "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/15",
    orange: active
      ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50 shadow-sm ring-1 ring-orange-500/20"
      : "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/15",
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium
        border transition-all duration-150 cursor-pointer select-none
        ${colorMap[color]}
      `}
    >
      {label}
    </button>
  );
}

export function SearchAndFilters({
  search, onSearchChange,
  filters, onFiltersChange,
  sortBy, onSortChange,
  showFilters, onToggleFilters,
  activeFilterCount, onResetFilters,
  onPageReset,
  isSearching,
  searchInputRef,
  onExportCsv,
}: SearchAndFiltersProps) {
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets());
  const [presetName, setPresetName] = useState("");
  const [showSavePopover, setShowSavePopover] = useState(false);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: SavedPreset = { name: presetName.trim(), filters, sortBy };
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
    setShowSavePopover(false);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    onPageReset();
    onFiltersChange(() => preset.filters);
    onSortChange(preset.sortBy);
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    savePresets(updated);
  };

  return (
    <>
      {/* Search bar + sort + actions row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 animate-in fade-in duration-300 delay-100">
        <div className="relative flex-1">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <Input ref={searchInputRef} placeholder="Search domains... (press / to focus)" value={search} onChange={e => onSearchChange(e.target.value)} className="pl-10 bg-input" />
        </div>
        <div className="flex gap-2 sm:gap-4 overflow-x-auto">
          <Select value={sortBy} onValueChange={(value) => { onPageReset(); onSortChange(value); }}>
            <SelectTrigger className="w-[140px] sm:w-[180px] bg-background flex-shrink-0">
              <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Saved Presets */}
          {presets.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 gap-1">
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline">Presets</span>
                  <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {presets.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="space-y-1">
                  {presets.map((p) => (
                    <div key={p.name} className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-start text-xs h-8 truncate"
                        onClick={() => handleLoadPreset(p)}
                      >
                        {p.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleDeletePreset(p.name)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {activeFilterCount > 0 && (
            <Popover open={showSavePopover} onOpenChange={setShowSavePopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 gap-1">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3">
                <p className="text-xs text-muted-foreground mb-2">Save current filters as a preset</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleSavePreset} disabled={!presetName.trim()}>
                    Save
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {onExportCsv && (
            <Button variant="outline" size="sm" className="flex-shrink-0 gap-1" onClick={onExportCsv}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Chip-based Filter Panel */}
      <Collapsible open={showFilters} onOpenChange={onToggleFilters}>
        <div className="mb-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300 delay-100">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Filter by Category</span>
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
                      onResetFilters();
                    }}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* TLD Extension */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  TLD Extension
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {TLD_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={filters.tld === opt.value}
                      onClick={() => {
                        onPageReset();
                        onFiltersChange(f => ({ ...f, tld: opt.value }));
                      }}
                      color="green"
                    />
                  ))}
                </div>
              </div>

              {/* Marketplace */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Marketplace
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={filters.inventorySource === opt.value}
                      onClick={() => {
                        onPageReset();
                        onFiltersChange(f => ({ ...f, inventorySource: opt.value }));
                      }}
                      color="blue"
                    />
                  ))}
                </div>
              </div>

              {/* Auction Type */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Auction Type
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {AUCTION_TYPE_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={filters.auctionType === opt.value}
                      onClick={() => {
                        onPageReset();
                        onFiltersChange(f => ({ ...f, auctionType: opt.value }));
                      }}
                      color="purple"
                    />
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Price Range
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_PRESETS.map((preset) => (
                    <ChipButton
                      key={preset.label}
                      label={preset.label}
                      active={filters.minPrice === preset.min && filters.maxPrice === preset.max}
                      onClick={() => {
                        onPageReset();
                        onFiltersChange(f => ({ ...f, minPrice: preset.min, maxPrice: preset.max }));
                      }}
                      color="amber"
                    />
                  ))}
                </div>
              </div>

              {/* Active filter summary */}
              {activeFilterCount > 0 && (
                <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
                  {filters.tld !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      TLD: {filters.tld}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, tld: "all" }))} />
                    </Badge>
                  )}
                  {filters.auctionType !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      Type: {AUCTION_TYPE_OPTIONS.find(o => o.value === filters.auctionType)?.label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, auctionType: "all" }))} />
                    </Badge>
                  )}
                  {filters.inventorySource !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      Source: {SOURCE_OPTIONS.find(s => s.value === filters.inventorySource)?.label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, inventorySource: "all" }))} />
                    </Badge>
                  )}
                  {(filters.minPrice > 0 || filters.maxPrice < 1000000) && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      ${filters.minPrice.toLocaleString()} – ${filters.maxPrice.toLocaleString()}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, minPrice: 0, maxPrice: 1000000 }))} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </>
  );
}
