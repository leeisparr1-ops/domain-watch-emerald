import { useState, useMemo } from "react";
import { Loader2, Target, ChevronLeft, ChevronRight, Trash2, Bird, CheckSquare, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DomainTable } from "./DomainTable";
import {
  MatchesFilterPanel,
  applyMatchesFilters,
  DEFAULT_MATCHES_FILTERS,
  type MatchesFilters,
} from "./MatchesFilterPanel";

interface MatchDomain {
  auction_id: string;
  domain_name: string;
  price: number;
  end_time: string | null;
  pattern_description: string;
  alert_id?: string;
  bid_count?: number;
  traffic_count?: number;
  domain_age?: number;
  auction_type?: string;
  tld?: string;
  valuation?: number;
  inventory_source?: string;
}

interface AuctionDomain {
  id: string;
  domain: string;
  auctionEndTime: string;
  price: number;
  numberOfBids: number;
  traffic: number;
  domainAge: number;
  auctionType: string;
  tld: string;
  valuation?: number;
  inventorySource?: string;
  brandabilityScore?: number | null;
  pronounceabilityScore?: number | null;
  trademarkRisk?: string | null;
}

interface MatchesViewProps {
  loading: boolean;
  matches: MatchDomain[];
  totalCount: number;
  dismissedCount?: number;
  dismissedList?: string[];
  page: number;
  perPage: number;
  hideEnded: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onHideEndedChange: (hide: boolean) => void;
  onClearAll: () => void;
  onDomainClick: (domain: AuctionDomain) => void;
  onDismiss?: (domainName: string) => void;
  onDismissMany?: (domainNames: string[]) => void;
  onUndismiss?: (domainName: string) => void;
  isFavorite?: (domainName: string) => boolean;
}

export function MatchesView({
  loading, matches, totalCount, dismissedCount = 0, dismissedList = [], page, perPage,
  hideEnded, onPageChange, onPerPageChange,
  onHideEndedChange, onClearAll, onDomainClick,
  onDismiss, onDismissMany, onUndismiss, isFavorite,
}: MatchesViewProps) {
  const totalPages = Math.ceil(totalCount / perPage);
  const [selectedForDismiss, setSelectedForDismiss] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [matchFilters, setMatchFilters] = useState<MatchesFilters>({
    ...DEFAULT_MATCHES_FILTERS,
    hideEnded,
  });

  // Sync hideEnded between parent and local filter state
  const handleFiltersChange = (newFilters: MatchesFilters) => {
    if (newFilters.hideEnded !== matchFilters.hideEnded) {
      onHideEndedChange(newFilters.hideEnded);
    }
    setMatchFilters(newFilters);
  };

  const handleResetFilters = () => {
    setMatchFilters({ ...DEFAULT_MATCHES_FILTERS, hideEnded });
  };

  // Count active filters (excluding hideEnded which is always shown)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (matchFilters.tlds.length > 0) count++;
    if (matchFilters.sources.length > 0) count++;
    if (matchFilters.patterns.length > 0) count++;
    if (matchFilters.wordCounts.length > 0) count++;
    if (matchFilters.priceRange !== "any") count++;
    if (matchFilters.minLength !== null) count++;
    if (matchFilters.maxLength !== null) count++;
    if (matchFilters.noNumbers) count++;
    if (matchFilters.noHyphens) count++;
    return count;
  }, [matchFilters]);

  // Apply client-side filters
  const filteredMatches = useMemo(
    () => applyMatchesFilters(matches, matchFilters),
    [matches, matchFilters]
  );

  const toggleSelect = (domainName: string) => {
    setSelectedForDismiss(prev => {
      const next = new Set(prev);
      if (next.has(domainName)) next.delete(domainName);
      else next.add(domainName);
      return next;
    });
  };

  const handleBulkDismiss = () => {
    if (onDismissMany && selectedForDismiss.size > 0) {
      onDismissMany(Array.from(selectedForDismiss));
      setSelectedForDismiss(new Set());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading matches...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="mb-2">No pattern matches found.</p>
          <p className="text-xs text-muted-foreground">
            Matches will appear here when your patterns find new domains.
          </p>
          {dismissedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              <Bird className="w-3 h-3 inline mr-1" />
              {dismissedCount} domain{dismissedCount !== 1 ? 's' : ''} dismissed
            </p>
          )}
        </div>

        {dismissedCount > 0 && onUndismiss && (
          <DismissedDomainsSection
            dismissedList={dismissedList}
            dismissedCount={dismissedCount}
            showDismissed={showDismissed}
            onToggle={() => setShowDismissed(!showDismissed)}
            onUndismiss={onUndismiss}
          />
        )}
      </div>
    );
  }

  const matchesAsDomains: AuctionDomain[] = filteredMatches.map(match => ({
    id: match.auction_id,
    domain: match.domain_name,
    auctionEndTime: match.end_time || '',
    price: match.price,
    numberOfBids: match.bid_count || 0,
    traffic: match.traffic_count || 0,
    domainAge: match.domain_age || 0,
    auctionType: match.auction_type || 'Bid',
    tld: match.tld || '',
    valuation: match.valuation,
    inventorySource: match.inventory_source,
  }));

  const patternMap: Record<string, string> = {};
  filteredMatches.forEach(match => {
    patternMap[match.auction_id] = match.pattern_description;
  });

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Smart Filters Panel */}
        <MatchesFilterPanel
          matches={matches}
          filters={matchFilters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {filteredMatches.length} of {matches.length} matches
              {filteredMatches.length !== matches.length && (
                <span className="text-primary ml-1">
                  (filtered)
                </span>
              )}
              {dismissedCount > 0 && (
                <span className="ml-1 text-muted-foreground/60">
                  · {dismissedCount} dismissed
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk dismiss */}
            {selectedForDismiss.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDismiss}
                className="text-orange-600 hover:text-orange-700 border-orange-300"
              >
              <Bird className="w-4 h-4 mr-1" />
                Dismiss {selectedForDismiss.size}
              </Button>
            )}
            {/* Dismiss all non-favorited */}
            {onDismissMany && isFavorite && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 border-orange-300">
                    <Bird className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Dismiss non-favorited</span>
                    <span className="sm:hidden">Dismiss unfav</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Dismiss all non-favorited?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will dismiss all {filteredMatches.filter(m => !isFavorite(m.domain_name)).length} non-favorited domains on this page. They won't appear in future matches.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        const nonFav = filteredMatches.filter(m => !isFavorite(m.domain_name)).map(m => m.domain_name);
                        if (nonFav.length > 0) onDismissMany(nonFav);
                      }}
                      className="bg-orange-600 text-white hover:bg-orange-700"
                    >
                      Dismiss {filteredMatches.filter(m => !isFavorite(m.domain_name)).length} domains
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all matches?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {totalCount} pattern matches from your history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Dismiss instructions hint */}
        {onDismiss && selectedForDismiss.size === 0 && (
          <p className="text-xs text-muted-foreground/60 inline-flex items-center gap-1 flex-wrap">
            Tip: Click the <Bird className="w-3 h-3 inline-block shrink-0" /> hawk icon on any domain to dismiss it permanently from future matches.
          </p>
        )}

        {filteredMatches.length === 0 && matches.length > 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm mb-2">No matches found with current filters.</p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <DomainTable
            domains={matchesAsDomains}
            onDomainClick={onDomainClick}
            showPatternColumn={true}
            patternDescriptions={patternMap}
            onDismiss={onDismiss ? (domain) => {
              onDismiss(domain);
              setSelectedForDismiss(prev => {
                const next = new Set(prev);
                next.delete(domain);
                return next;
              });
            } : undefined}
            selectedDismiss={selectedForDismiss}
            onToggleDismissSelect={onDismissMany ? toggleSelect : undefined}
          />
        )}

        {/* Dismissed domains section */}
        {dismissedCount > 0 && onUndismiss && (
          <DismissedDomainsSection
            dismissedList={dismissedList}
            dismissedCount={dismissedCount}
            showDismissed={showDismissed}
            onToggle={() => setShowDismissed(!showDismissed)}
            onUndismiss={onUndismiss}
          />
        )}

        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={perPage.toString()} onValueChange={(v) => onPerPageChange(Number(v))}>
                <SelectTrigger className="w-20 h-8 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/** Collapsible section showing dismissed domain names with restore buttons */
function DismissedDomainsSection({
  dismissedList,
  dismissedCount,
  showDismissed,
  onToggle,
  onUndismiss,
}: {
  dismissedList: string[];
  dismissedCount: number;
  showDismissed: boolean;
  onToggle: () => void;
  onUndismiss: (domainName: string) => void;
}) {
  return (
    <Collapsible open={showDismissed} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Bird className="w-4 h-4" />
            View dismissed domains
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {dismissedCount}
            </Badge>
          </span>
          {showDismissed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-1 max-h-64 overflow-y-auto">
          {dismissedList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No dismissed domains</p>
          ) : (
            dismissedList.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <span className="font-mono text-sm text-foreground truncate mr-2">{domain}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      onClick={() => onUndismiss(domain)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>Restore — will show in matches again</p></TooltipContent>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
