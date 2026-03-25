import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Clock, Gavel, TrendingUp, Calendar, Globe, DollarSign, Users, BarChart3, Hash, Timer, Shield, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
import { useBackClose } from "@/hooks/useBackClose";
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
  externalIsFavorite?: (domainName: string) => boolean;
  externalToggleFavorite?: (domainName: string, auctionId?: string) => void;
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

/** Extract meaningful keyword fragments (3+ chars) from a domain SLD */
function extractKeywords(sld: string): string[] {
  const clean = sld.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return [clean];
  
  const keywords: string[] = [];
  // Common word boundaries in domain names
  const common3 = ['app','web','net','dev','hub','lab','pro','pay','buy','get','top','max','one','bio','eco','fin','med','edu','biz','art','fit','bot','api','cloud','smart','fast','data','code','tech','cyber','green','blue','gold','star','fire','dark','moon','sun','home','farm','land','trade','craft','forge','flow','peak','core','link','dash','snap','flip','next','mega','meta','wave','mind','sync','nest','grid','pulse','base','dock','mint','node','open','swift','lite'];
  
  for (const word of common3) {
    if (clean.includes(word) && word.length >= 3) {
      keywords.push(word);
    }
  }
  
  // Also try splitting by length segments
  if (keywords.length === 0 && clean.length >= 6) {
    keywords.push(clean.substring(0, Math.ceil(clean.length / 2)));
    keywords.push(clean.substring(Math.ceil(clean.length / 2)));
  }
  
  if (keywords.length === 0) keywords.push(clean);
  
  return [...new Set(keywords)].slice(0, 4);
}

interface SimilarDomain {
  id: string;
  domain_name: string;
  price: number;
  valuation: number | null;
  tld: string | null;
  end_time: string | null;
}

export function DomainDetailSheet({ domain, open, onOpenChange, externalIsFavorite, externalToggleFavorite }: DomainDetailSheetProps) {
  const { isFavorite: localIsFavorite, toggleFavorite: localToggleFavorite } = useFavorites();
  const checkIsFavorite = externalIsFavorite ?? localIsFavorite;
  const doToggleFavorite = externalToggleFavorite ?? localToggleFavorite;
  const navigate = useNavigate();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useBackClose(open, handleClose);

  const [similarDomains, setSimilarDomains] = useState<SimilarDomain[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    if (!open || !domain) { setSimilarDomains([]); return; }
    const sld = getDomainWithoutTld(domain.domain);
    const keywords = extractKeywords(sld);
    setSimilarLoading(true);

    const fetchSimilar = async () => {
      try {
        // Build OR filter from keywords
        const orFilter = keywords.map(k => `domain_name.ilike.%${k}%`).join(',');
        const { data } = await supabase
          .from('auctions')
          .select('id, domain_name, price, valuation, tld, end_time')
          .or(orFilter)
          .neq('domain_name', domain.domain)
          .gt('end_time', new Date().toISOString())
          .order('gem_score', { ascending: false, nullsFirst: false })
          .limit(8);
        setSimilarDomains(data || []);
      } catch { setSimilarDomains([]); }
      setSimilarLoading(false);
    };
    fetchSimilar();
  }, [open, domain?.domain]);
  
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
                  doToggleFavorite(domain.domain, domain.id);
                }}
                className={checkIsFavorite(domain.domain) ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}
              >
                <Heart className={`w-5 h-5 ${checkIsFavorite(domain.domain) ? "fill-current" : ""}`} />
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

        {/* Price & Valuation highlight section */}
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
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm text-muted-foreground mb-1">Algo Valuation</div>
              {domain.valuation && domain.valuation > 0 ? (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    ${domain.valuation.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {domain.valuation > domain.price ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {Math.round(((domain.valuation - domain.price) / domain.valuation) * 100)}% below valuation
                      </span>
                    ) : (
                      <span className="text-orange-500 font-medium">
                        {Math.round(((domain.price - domain.valuation) / domain.valuation) * 100)}% above valuation
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">Not yet valued</div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-3 gap-2 text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => {
              onOpenChange(false);
              setTimeout(() => navigate(`/tools?tab=advisor&domain=${encodeURIComponent(domain.domain)}`), 150);
            }}
          >
            <Sparkles className="w-4 h-4" />
            Deep Analysis with AI Domain Advisor
          </Button>

          {/* Action buttons - moved under AI Advisor */}
          <div className="mt-3 space-y-2">
            <a
              href={`https://auctions.godaddy.com/trpItemListing.aspx?domain=${encodeURIComponent(domain.domain)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" size="lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Auction
              </Button>
            </a>
            <div className="grid grid-cols-3 gap-2">
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
              <a
                href={`https://openlinkprofiler.org/r/${domain.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full" size="sm">
                  Backlinks
                </Button>
              </a>
            </div>
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
        {/* Similar Domains */}
        <div className="py-4 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Similar Domains
          </h3>
          {similarLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Finding similar domains…
            </div>
          ) : similarDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No similar domains found in active auctions.</p>
          ) : (
            <div className="space-y-2">
              {similarDomains.map((sd) => (
                <div
                  key={sd.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => {
                    onOpenChange(false);
                    // Small delay to allow sheet close animation
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('open-domain-detail', { detail: sd }));
                    }, 200);
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium text-foreground truncate">{sd.domain_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sd.end_time ? formatTimeRemaining(sd.end_time) + ' left' : 'No end time'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-semibold text-primary">${sd.price.toLocaleString()}</div>
                    {sd.valuation && sd.valuation > 0 && (
                      <div className="text-xs text-muted-foreground">Val: ${sd.valuation.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </TooltipProvider>
  );
}
