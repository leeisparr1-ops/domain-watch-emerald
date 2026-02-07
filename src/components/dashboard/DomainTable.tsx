import * as React from "react";
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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

interface DomainTableProps {
  domains: DomainData[];
  onDomainClick?: (domain: DomainData) => void;
  sortBy?: string;
  onSortChange?: (sortKey: string) => void;
  showPatternColumn?: boolean;
  patternDescriptions?: Record<string, string>;
}

function formatTimeRemaining(endTime: string): { text: string; urgent: boolean; ended: boolean } {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { text: "Ended", urgent: false, ended: true };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h`, urgent: false, ended: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, urgent: hours < 6, ended: false };
  }
  return { text: `${minutes}m`, urgent: true, ended: false };
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
  patternDescriptions = {}
}: DomainTableProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (domains.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
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
              <TableHead className="whitespace-nowrap">Val.</TableHead>
              <TableHead className="whitespace-nowrap">Age</TableHead>
              <TableHead className="whitespace-nowrap">Len</TableHead>
              <TableHead className="whitespace-nowrap">Traffic</TableHead>
              <TableHead className="whitespace-nowrap">Ends</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {domains.map((d) => {
                const timeInfo = formatTimeRemaining(d.auctionEndTime);
                const domainWithoutTld = getDomainWithoutTld(d.domain);
                const valueIndicator = getValueIndicator(d.price, d.valuation);
                
                return (
                  <TableRow 
                    key={d.id}
                    className={cn(
                      "cursor-pointer transition-colors group",
                      timeInfo.ended ? "opacity-60" : "hover:bg-muted/50"
                    )}
                    onClick={() => onDomainClick?.(d)}
                  >
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
                        {valueIndicator && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <valueIndicator.icon className={cn("w-3 h-3", valueIndicator.color)} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{valueIndicator.label} valuation</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>

                    {/* Bids */}
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {d.numberOfBids}
                    </TableCell>

                    {/* Valuation */}
                    <TableCell className="py-2 text-sm">
                      {d.valuation && d.valuation > 0 ? (
                        <span className="text-muted-foreground">
                          ${d.valuation.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
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
                        timeInfo.ended ? "text-destructive" : 
                        timeInfo.urgent ? "text-orange-500" : 
                        "text-muted-foreground"
                      )}>
                        <Clock className="w-3 h-3" />
                        <span className="whitespace-nowrap">{timeInfo.text}</span>
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
                        <a
                          href={
                            d.inventorySource === 'namecheap'
                              ? `https://www.namecheap.com/market/buynow/${encodeURIComponent(d.domain)}/`
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
