import * as React from "react";
import { useMemo } from "react";
import { 
  ExternalLink, 
  Clock, 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Award,
  Mic,
  Shield,
  Sparkles,
  Bird,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFavorites } from "@/hooks/useFavorites";
import { SpamRiskBadge } from "./SpamRiskBadge";
import { cn } from "@/lib/utils";
import { scoreBrandability } from "@/lib/brandability";
import { scorePronounceability } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";

interface DomainData {
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

interface DomainTableProps {
  domains: DomainData[];
  onDomainClick?: (domain: DomainData) => void;
  sortBy?: string;
  onSortChange?: (sortKey: string) => void;
  showPatternColumn?: boolean;
  patternDescriptions?: Record<string, string>;
  selectedRows?: Set<string>;
  onToggleRow?: (id: string) => void;
  onSelectAll?: () => void;
  highlightedIndex?: number;
  onDismiss?: (domainName: string) => void;
  selectedDismiss?: Set<string>;
  onToggleDismissSelect?: (domainName: string) => void;
}

type UrgencyLevel = "ended" | "critical" | "urgent" | "soon" | "normal";

function formatTimeRemaining(endTime: string): { text: string; urgent: boolean; ended: boolean; urgency: UrgencyLevel } {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { text: "Ended", urgent: false, ended: true, urgency: "ended" };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h`, urgent: false, ended: false, urgency: "normal" };
  }
  if (hours >= 6) {
    return { text: `${hours}h ${minutes}m`, urgent: false, ended: false, urgency: "soon" };
  }
  if (hours >= 1) {
    return { text: `${hours}h ${minutes}m`, urgent: true, ended: false, urgency: "urgent" };
  }
  return { text: `${minutes}m`, urgent: true, ended: false, urgency: "critical" };
}

function getUrgencyStyles(urgency: UrgencyLevel) {
  switch (urgency) {
    case "critical": return "text-red-600 dark:text-red-400 font-semibold animate-pulse";
    case "urgent": return "text-orange-500 dark:text-orange-400 font-medium";
    case "soon": return "text-amber-500 dark:text-amber-400";
    case "ended": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

function getDomainWithoutTld(domain: string): string {
  const parts = domain.split(".");
  if (parts.length > 1) {
    return parts.slice(0, -1).join(".");
  }
  return domain;
}

function getValueIndicator(price: number, valuation?: number) {
  if (!valuation || valuation <= 0) return null;
  
  const diff = ((valuation - price) / valuation) * 100;
  
  if (diff > 20) {
    return { icon: TrendingUp, color: "text-green-500", label: `${Math.round(diff)}% below` };
  } else if (diff < -20) {
    return { icon: TrendingDown, color: "text-orange-500", label: `${Math.round(-diff)}% above` };
  }
  return { icon: Minus, color: "text-muted-foreground", label: "Fair price" };
}

type SortableColumn = "domain_name" | "price" | "end_time" | "bid_count" | "domain_age" | "valuation";

function getQuickScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function MiniQuickStats({ domain, precomputed }: { 
  domain: string; 
  precomputed?: { brandability?: number | null; pronounceability?: number | null; trademark?: string | null };
}) {
  const stats = useMemo(() => {
    // Use pre-computed scores from DB if available, otherwise fall back to client-side
    const hasPrecomputed = precomputed?.brandability != null;
    
    const brandScore = hasPrecomputed ? precomputed.brandability! : scoreBrandability(domain).overall;
    const pronounceScore = precomputed?.pronounceability != null ? precomputed.pronounceability : scorePronounceability(domain).score;
    const tmRisk = (precomputed?.trademark || checkTrademarkRisk(domain).riskLevel) as "none" | "low" | "medium" | "high";
    const tmDisplay = getTrademarkRiskDisplay(tmRisk);
    
    return { brandScore, pronounceScore, tmRisk, tmDisplay };
  }, [domain, precomputed?.brandability, precomputed?.pronounceability, precomputed?.trademark]);

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-[10px] font-medium flex items-center gap-0.5", getQuickScoreColor(stats.brandScore))}>
            <Award className="w-2.5 h-2.5" />{stats.brandScore}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Brandability: {stats.brandScore}/100</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-[10px] font-medium flex items-center gap-0.5", getQuickScoreColor(stats.pronounceScore))}>
            <Mic className="w-2.5 h-2.5" />{stats.pronounceScore}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Pronounceability: {stats.pronounceScore}/100</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "text-[10px] font-medium flex items-center gap-0.5",
            stats.tmRisk === "none" ? "text-emerald-600 dark:text-emerald-400" :
            stats.tmRisk === "low" ? "text-amber-600 dark:text-amber-400" :
            "text-red-600 dark:text-red-400"
          )}>
            <Shield className="w-2.5 h-2.5" />{stats.tmDisplay.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Trademark: {stats.tmDisplay.label}</p></TooltipContent>
      </Tooltip>
    </div>
  );
}

const COLUMN_SORT_MAP: Record<SortableColumn, { asc: string; desc: string }> = {
  domain_name: { asc: "domain_name_asc", desc: "domain_name_desc" },
  price: { asc: "price_asc", desc: "price_desc" },
  end_time: { asc: "end_time_asc", desc: "end_time_desc" },
  bid_count: { asc: "bid_count_asc", desc: "bid_count_desc" },
  domain_age: { asc: "domain_age_asc", desc: "domain_age_desc" },
  valuation: { asc: "valuation_asc", desc: "valuation_desc" },
};

function SortableHeader({ 
  column, 
  label, 
  currentSort, 
  onSort,
  className
}: { 
  column: SortableColumn; 
  label: string; 
  currentSort?: string;
  onSort?: (sortKey: string) => void;
  className?: string;
}) {
  const sortConfig = COLUMN_SORT_MAP[column];
  const isAsc = currentSort === sortConfig.asc;
  const isDesc = currentSort === sortConfig.desc;
  const isActive = isAsc || isDesc;
  
  const handleClick = () => {
    if (!onSort) return;
    if (isAsc) {
      onSort(sortConfig.desc);
    } else {
      onSort(sortConfig.asc);
    }
  };
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors whitespace-nowrap",
        isActive && "text-primary",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          isAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </div>
    </TableHead>
  );
}

export function DomainTable({ 
  domains, 
  onDomainClick, 
  sortBy, 
  onSortChange,
  showPatternColumn = false,
  patternDescriptions = {},
  selectedRows,
  onToggleRow,
  onSelectAll,
  highlightedIndex = -1,
  onDismiss,
  selectedDismiss,
  onToggleDismissSelect,
}: DomainTableProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  if (domains.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {onToggleRow && (
                <TableHead className="w-8 px-2">
                  <Checkbox
                    checked={selectedRows?.size === domains.length && domains.length > 0}
                    onCheckedChange={() => onSelectAll?.()}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="whitespace-nowrap">Domain</TableHead>
              {showPatternColumn && (
                <TableHead className="whitespace-nowrap">Pattern</TableHead>
              )}
              <SortableHeader 
                column="price" 
                label="Price" 
                currentSort={sortBy}
                onSort={onSortChange}
              />
              <TableHead className="whitespace-nowrap">Bids</TableHead>
              <SortableHeader 
                column="valuation" 
                label="Algo Val." 
                currentSort={sortBy}
                onSort={onSortChange}
              />
              <TableHead className="whitespace-nowrap">Age</TableHead>
              <TableHead className="whitespace-nowrap">Len</TableHead>
              <TableHead className="whitespace-nowrap">Traffic</TableHead>
              <SortableHeader 
                column="end_time" 
                label="Ends" 
                currentSort={sortBy}
                onSort={onSortChange}
              />
              <TableHead>Actions</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {domains.map((d, idx) => {
                const timeInfo = formatTimeRemaining(d.auctionEndTime);
                const domainWithoutTld = getDomainWithoutTld(d.domain);
                const valueIndicator = getValueIndicator(d.price, d.valuation);
                const isSelected = selectedRows?.has(d.id) ?? false;
                const isHighlighted = idx === highlightedIndex;
                
                return (
                  <TableRow 
                    key={d.id}
                    className={cn(
                      "cursor-pointer transition-colors group",
                      timeInfo.ended ? "opacity-60" : "hover:bg-muted/50",
                      isSelected && "bg-primary/5",
                      isHighlighted && "ring-1 ring-inset ring-primary/40 bg-muted/30"
                    )}
                    onClick={() => onDomainClick?.(d)}
                  >
                    {/* Bulk checkbox */}
                    {onToggleRow && (
                      <TableCell className="py-2 px-2 w-8" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleRow(d.id)}
                          aria-label={`Select ${d.domain}`}
                        />
                      </TableCell>
                    )}
                    {/* Domain */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-sm text-primary font-medium truncate max-w-[180px] sm:max-w-[220px]">
                            {d.domain}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {d.tld}
                            </Badge>
                            <SpamRiskBadge 
                              domainName={d.domain} 
                              showOnlyIfRisk={true}
                            />
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {d.auctionType || 'Bid'}
                            </span>
                          </div>
                          <MiniQuickStats 
                            domain={d.domain} 
                            precomputed={{
                              brandability: d.brandabilityScore,
                              pronounceability: d.pronounceabilityScore,
                              trademark: d.trademarkRisk,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Pattern (optional) */}
                    {showPatternColumn && (
                      <TableCell className="py-2">
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] px-1.5 py-0 h-5 max-w-[100px] truncate bg-primary/10 text-primary border-primary/30"
                        >
                          {patternDescriptions[d.id] || "-"}
                        </Badge>
                      </TableCell>
                    )}

                    {/* Price */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          ${d.price.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>

                    {/* Bids */}
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {d.numberOfBids}
                    </TableCell>

                    {/* Valuation */}
                    <TableCell className="py-2">
                      {d.valuation && d.valuation > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm text-foreground">
                              ${d.valuation.toLocaleString()}
                            </span>
                            {valueIndicator && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <valueIndicator.icon className={cn("w-3.5 h-3.5", valueIndicator.color)} />
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{valueIndicator.label} valuation</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <button
                            className="text-xs text-primary hover:underline flex items-center gap-1 w-fit font-medium mt-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tools?domain=${encodeURIComponent(d.domain)}`);
                            }}
                          >
                            <Sparkles className="w-4 h-4" />
                            AI Advisor
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tools?domain=${encodeURIComponent(d.domain)}`);
                          }}
                        >
                          <Sparkles className="w-4 h-4" />
                          AI Advisor
                        </button>
                      )}
                    </TableCell>

                    {/* Age */}
                    <TableCell className="py-2 text-sm">
                      {d.domainAge > 0 ? (
                        <span className="text-muted-foreground">{d.domainAge}y</span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>

                    {/* Length */}
                    <TableCell className="py-2 text-sm">
                      <span className="text-muted-foreground">{domainWithoutTld.length}</span>
                    </TableCell>

                    {/* Traffic */}
                    <TableCell className="py-2 text-sm">
                      {d.traffic > 0 ? (
                        <span className="text-muted-foreground">{d.traffic.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>

                    {/* Time Remaining */}
                    <TableCell className="py-2">
                      <div className={cn(
                        "flex items-center gap-1 text-sm",
                        getUrgencyStyles(timeInfo.urgency)
                      )}>
                        <Clock className="w-3 h-3" />
                        <span className="whitespace-nowrap">{timeInfo.text}</span>
                        {timeInfo.urgency === "critical" && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 ml-0.5">HOT</Badge>
                        )}
                        {timeInfo.urgency === "urgent" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-0.5 border-orange-400 text-orange-500">SOON</Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(d.domain, d.id);
                          }}
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4",
                              isFavorite(d.domain) 
                                ? "text-red-500 fill-current" 
                                : "text-muted-foreground hover:text-red-500"
                            )} 
                          />
                        </Button>
                        {onDismiss && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismiss(d.domain);
                                }}
                              >
                                <Bird className="w-4 h-4 text-muted-foreground hover:text-orange-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Dismiss — won't show again</p></TooltipContent>
                          </Tooltip>
                        )}
                        <a
                          href={
                            d.inventorySource === 'namecheap'
                              ? `https://www.namecheap.com/domains/marketplace/result/?query=${encodeURIComponent(d.domain.replace(/\.[^.]+$/, ''))}`
                              : `https://auctions.godaddy.com/trpItemListing.aspx?domain=${encodeURIComponent(d.domain)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>

                    {/* Click indicator */}
                    <TableCell className="py-2 w-8">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>Click for details</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </div>
    </TooltipProvider>
  );
}
