import { Loader2, Target, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
import { DomainTable } from "./DomainTable";

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
  page: number;
  perPage: number;
  hideEnded: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onHideEndedChange: (hide: boolean) => void;
  onClearAll: () => void;
  onDomainClick: (domain: AuctionDomain) => void;
}

export function MatchesView({
  loading, matches, totalCount, page, perPage,
  hideEnded, onPageChange, onPerPageChange,
  onHideEndedChange, onClearAll, onDomainClick,
}: MatchesViewProps) {
  const totalPages = Math.ceil(totalCount / perPage);

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
      <div className="text-center py-12 text-muted-foreground">
        <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="mb-2">No pattern matches found.</p>
        <p className="text-xs text-muted-foreground">
          Matches will appear here when your patterns find new domains.
        </p>
      </div>
    );
  }

  const matchesAsDomains: AuctionDomain[] = matches.map(match => ({
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
  matches.forEach(match => {
    patternMap[match.auction_id] = match.pattern_description;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * perPage + 1, totalCount)}-{Math.min(page * perPage, totalCount)} of {totalCount} matches
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hideEnded}
              onChange={(e) => onHideEndedChange(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-muted-foreground">
              {hideEnded ? "Hide ended" : "Show ended"}
            </span>
          </label>
        </div>
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

      <DomainTable
        domains={matchesAsDomains}
        onDomainClick={onDomainClick}
        showPatternColumn={true}
        patternDescriptions={patternMap}
      />

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
  );
}
