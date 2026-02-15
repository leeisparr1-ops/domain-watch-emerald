import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  totalDomainCount: number | null;
  lastRefresh: Date;
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
}

function formatLastRefresh(lastRefresh: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 120) return '1 min ago';
  return `${Math.floor(diff / 60)} mins ago`;
}

export function DashboardHeader({ totalDomainCount, lastRefresh, loading, onRefresh, onReset }: DashboardHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onReset}
            className="text-left hover:opacity-80 transition-opacity"
            title="Reset to dashboard home"
          >
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Domain <span className="gradient-text">Dashboard</span></h1>
          </button>
          <p className="text-sm sm:text-base text-muted-foreground">
            {totalDomainCount !== null ? (
              <>Tracking <span className="font-semibold text-foreground">{totalDomainCount.toLocaleString()}</span> domains across all marketplaces</>
            ) : (
              <>Browse and filter domain auctions</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Updated {formatLastRefresh(lastRefresh)}</span>
            <span className="sm:hidden">{formatLastRefresh(lastRefresh)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
