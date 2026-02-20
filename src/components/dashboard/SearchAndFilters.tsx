import { Search, Filter, ArrowUpDown, X, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Filters {
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
];

const AUCTION_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "bid", label: "Bid Auctions" },
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
  { label: "$50-$500", min: 50, max: 500 },
  { label: "$500-$5K", min: 500, max: 5000 },
  { label: "$5K+", min: 5000, max: 1000000 },
];

export const SORT_OPTIONS: SortOption[] = [
  { value: "end_time_asc", label: "Ending Soon", column: "end_time", ascending: true },
  { value: "end_time_desc", label: "Ending Last", column: "end_time", ascending: false },
  { value: "price_asc", label: "Price: Low to High", column: "price", ascending: true },
  { value: "price_desc", label: "Price: High to Low", column: "price", ascending: false },
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
  return (
    <>
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
          <Select
            value={filters.inventorySource}
            onValueChange={(value) => {
              onPageReset();
              onFiltersChange(f => ({ ...f, inventorySource: value }));
            }}
          >
            <SelectTrigger className="w-[130px] sm:w-[160px] bg-background flex-shrink-0">
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
              {SOURCE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={onToggleFilters}
            className="relative flex-shrink-0"
            size="sm"
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 sm:ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
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
          {onExportCsv && (
            <Button variant="outline" size="sm" onClick={onExportCsv} className="flex-shrink-0 gap-1">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 rounded-xl glass border border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filter Auctions</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onResetFilters}>
                <X className="w-4 h-4 mr-1" /> Clear Filters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">TLD Extension</label>
              <Select value={filters.tld} onValueChange={(value) => { onPageReset(); onFiltersChange(f => ({ ...f, tld: value })); }}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select TLD" /></SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
                  {TLD_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Auction Type</label>
              <Select value={filters.auctionType} onValueChange={(value) => { onPageReset(); onFiltersChange(f => ({ ...f, auctionType: value })); }}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
                  {AUCTION_TYPE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Marketplace</label>
              <Select value={filters.inventorySource} onValueChange={(value) => { onPageReset(); onFiltersChange(f => ({ ...f, inventorySource: value })); }}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select Source" /></SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
                  {SOURCE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Price Range</label>
              <div className="flex flex-wrap gap-2">
                {PRICE_PRESETS.map(preset => (
                  <Button 
                    key={preset.label}
                    variant={filters.minPrice === preset.min && filters.maxPrice === preset.max ? "default" : "outline"}
                    size="sm"
                    onClick={() => { onPageReset(); onFiltersChange(f => ({ ...f, minPrice: preset.min, maxPrice: preset.max })); }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
              {filters.tld !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  TLD: {filters.tld}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, tld: "all" }))} />
                </Badge>
              )}
              {filters.auctionType !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {filters.auctionType}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, auctionType: "all" }))} />
                </Badge>
              )}
              {filters.inventorySource !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Source: {SOURCE_OPTIONS.find(s => s.value === filters.inventorySource)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, inventorySource: "all" }))} />
                </Badge>
              )}
              {(filters.minPrice > 0 || filters.maxPrice < 1000000) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  ${filters.minPrice.toLocaleString()} - ${filters.maxPrice.toLocaleString()}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltersChange(f => ({ ...f, minPrice: 0, maxPrice: 1000000 }))} />
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
