import * as React from "react";
import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDomainRisk, DomainRisk } from "@/hooks/useDomainRisk";
import { cn } from "@/lib/utils";

interface SpamRiskBadgeProps {
  domainName: string;
  cachedRisk?: DomainRisk | null;
  onRiskLoaded?: (risk: DomainRisk) => void;
  showOnlyIfRisk?: boolean;
  size?: "sm" | "md";
}

export function SpamRiskBadge({ 
  domainName, 
  cachedRisk, 
  onRiskLoaded,
  showOnlyIfRisk = false,
  size = "sm"
}: SpamRiskBadgeProps) {
  const { checkDomainRisk, isChecking } = useDomainRisk();
  const [risk, setRisk] = useState<DomainRisk | null>(cachedRisk || null);
  const [hasChecked, setHasChecked] = useState(!!cachedRisk);

  // Check risk on mount if not cached
  useEffect(() => {
    if (!cachedRisk && !hasChecked) {
      setHasChecked(true);
      checkDomainRisk(domainName).then((result) => {
        if (result) {
          setRisk(result);
          onRiskLoaded?.(result);
        }
      });
    }
  }, [domainName, cachedRisk, hasChecked, checkDomainRisk, onRiskLoaded]);

  // Update if cachedRisk changes
  useEffect(() => {
    if (cachedRisk) {
      setRisk(cachedRisk);
    }
  }, [cachedRisk]);

  if (isChecking) {
    return (
      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-0.5">
        <Loader2 className={cn("animate-spin", size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
      </Badge>
    );
  }

  if (!risk) {
    if (showOnlyIfRisk) return null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-0.5 text-muted-foreground/50">
            <ShieldQuestion className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Risk check pending</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Don't show badge if no risk and showOnlyIfRisk is true
  if (risk.risk_level === "none" && showOnlyIfRisk) {
    return null;
  }

  const riskConfig = {
    none: {
      icon: ShieldCheck,
      color: "text-green-600 border-green-600/30 bg-green-600/10",
      label: "Clean",
      description: "No spam or blacklist issues detected",
    },
    low: {
      icon: Shield,
      color: "text-yellow-600 border-yellow-600/30 bg-yellow-600/10",
      label: "Low Risk",
      description: "Minor spam indicators found",
    },
    medium: {
      icon: ShieldAlert,
      color: "text-orange-600 border-orange-600/30 bg-orange-600/10",
      label: "Med Risk",
      description: "Domain found on spam blacklists",
    },
    high: {
      icon: ShieldAlert,
      color: "text-red-600 border-red-600/30 bg-red-600/10",
      label: "High Risk",
      description: "Domain flagged for phishing/malware",
    },
  };

  const config = riskConfig[risk.risk_level];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1 py-0 h-4 gap-0.5 cursor-help",
            config.color
          )}
        >
          <Icon className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
          {size === "md" && <span>{config.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          {risk.details.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {risk.details.map((detail, i) => (
                <li key={i}>• {detail}</li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Checked: {new Date(risk.checked_at).toLocaleDateString()}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
