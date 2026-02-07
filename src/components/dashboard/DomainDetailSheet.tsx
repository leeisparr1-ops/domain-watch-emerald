import * as React from "react";
import { ExternalLink, Clock, Gavel, TrendingUp, Calendar, Globe, DollarSign, Users, BarChart3, Hash, Timer, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFavorites } from "@/hooks/useFavorites";
import { SpamRiskBadge } from "./SpamRiskBadge";
import { Heart } from "lucide-react";

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

interface DomainDetailSheetProps {
  domain: DomainData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDomainWithoutTld(domain: string): string {
  const parts = domain.split(".");
  if (parts.length > 1) {
    return parts.slice(0, -1).join(".");
  }
  return domain;
}

export function DomainDetailSheet({ domain, open, onOpenChange }: DomainDetailSheetProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  
  if (!domain) return null;

  const domainWithoutTld = getDomainWithoutTld(domain.domain);
  const domainLength = domainWithoutTld.length;
  const hasEnded = new Date(domain.auctionEndTime).getTime() < Date.now();

  const stats = [
    {
      label: "Domain",
      value: domain.domain,
      icon: Globe,
      highlight: true,
    },
    {
      label: "TLD",
      value: domain.tld || "-",
      icon: Hash,
    },
    {
      label: "Length",
      value: `${domainLength} chars`,
      icon: BarChart3,
      tooltip: "Characters excluding TLD",
    },
    {
      label: "Price",
      value: `$${domain.price.toLocaleString()}`,
      icon: DollarSign,
      highlight: true,
    },
    {
      label: "Valuation",
      value: domain.valuation ? `$${domain.valuation.toLocaleString()}` : "-",
      icon: TrendingUp,
    },
    {
      label: "Bids",
      value: domain.numberOfBids.toString(),
      icon: Users,
    },
    {
      label: "Traffic",
      value: domain.traffic > 0 ? domain.traffic.toLocaleString() : "-",
      icon: BarChart3,
    },
    {
      label: "Domain Age",
      value: domain.domainAge > 0 ? `${domain.domainAge} years` : "-",
      icon: Calendar,
    },
    {
      label: "Type",
      value: domain.auctionType || "Auction",
      icon: Gavel,
    },
    {
      label: "Source",
      value: domain.inventorySource || "Auction",
      icon: Globe,
    },
    {
      label: "End Time",
      value: formatDate(domain.auctionEndTime),
      icon: Clock,
    },
    {
      label: "Time Left",
      value: formatTimeRemaining(domain.auctionEndTime),
      icon: Timer,
      highlight: !hasEnded,
      warning: hasEnded,
    },
  ];

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-3 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-mono text-xl text-primary">
                {domain.domain}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(domain.id, domain.domain);
                }}
                className={isFavorite(domain.id) ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}
              >
                <Heart className={`w-5 h-5 ${isFavorite(domain.id) ? "fill-current" : ""}`} />
              </Button>
            </div>
            <SheetDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {domain.tld}
              </Badge>
              <SpamRiskBadge domainName={domain.domain} size="md" />
              <Badge 
                variant={hasEnded ? "destructive" : "secondary"} 
                className="text-xs"
              >
                {hasEnded ? "Ended" : domain.auctionType || "Auction"}
              </Badge>
              {!hasEnded && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeRemaining(domain.auctionEndTime)}
                </Badge>
              )}
            </SheetDescription>
          </SheetHeader>

        {/* Price highlight section */}
        <div className="py-6 border-b border-border">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="text-sm text-muted-foreground mb-1">Current Price</div>
              <div className="text-2xl font-bold text-primary">
                ${domain.price.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {domain.numberOfBids} bid{domain.numberOfBids !== 1 ? "s" : ""}
              </div>
            </div>
            {domain.valuation && domain.valuation > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Est. Value</div>
                <div className="text-2xl font-bold text-foreground">
                  ${domain.valuation.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {domain.valuation > domain.price ? (
                    <span className="text-green-500">
                      {Math.round(((domain.valuation - domain.price) / domain.valuation) * 100)}% below value
                    </span>
                  ) : (
                    <span className="text-orange-500">
                      {Math.round(((domain.price - domain.valuation) / domain.valuation) * 100)}% above value
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats table */}
        <div className="py-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Domain Statistics</h3>
          <Table>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.label} className="border-border/50 hover:bg-muted/30">
                  <TableCell className="py-3 px-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <stat.icon className="w-4 h-4" />
                      <span className="text-sm">{stat.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`py-3 px-2 text-right font-medium ${
                    stat.highlight ? "text-primary" : 
                    stat.warning ? "text-destructive" : 
                    "text-foreground"
                  }`}>
                    {stat.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t border-border space-y-3">
          <a
            href={
              domain.inventorySource === 'namecheap'
                ? `https://www.namecheap.com/market/buynow/${encodeURIComponent(domain.domain)}/`
                : `https://auctions.godaddy.com/trpItemListing.aspx?domain=${encodeURIComponent(domain.domain)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full" size="lg">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Auction
            </Button>
          </a>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://web.archive.org/web/*/${domain.domain}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full" size="sm">
                Wayback Machine
              </Button>
            </a>
            <a
              href={`https://www.whois.com/whois/${domain.domain}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full" size="sm">
                WHOIS Lookup
              </Button>
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </TooltipProvider>
  );
}
