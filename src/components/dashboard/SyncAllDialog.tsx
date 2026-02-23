import { useState, useCallback } from "react";
import { RefreshCw, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBackClose } from "@/hooks/useBackClose";

interface InventoryStatus {
  type: string;
  label: string;
  success: boolean | null;
  count?: number;
  error?: string;
}

const INVENTORY_SOURCES: { type: string; label: string }[] = [
  { type: "featured", label: "Featured Listings" },
  { type: "mostActive", label: "Most Active" },
  { type: "listings2", label: "All Listings 2" },
  { type: "nonAdultListings2", label: "Non-Adult Listings" },
  { type: "fiveLetter", label: "5-Letter Auctions" },
  { type: "withPageviews", label: "With Pageviews" },
  { type: "recent", label: "Recent Listings" },
  { type: "auctionsEndingToday", label: "Ending Today" },
  { type: "endingTomorrow", label: "Ending Tomorrow" },
  { type: "auctionsEndingTomorrow", label: "Auctions Tomorrow" },
];

interface SyncAllDialogProps {
  onSyncComplete?: () => void;
}

export function SyncAllDialog({ onSyncComplete }: SyncAllDialogProps) {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);
  useBackClose(open, handleClose);
  const [syncing, setSyncing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<InventoryStatus[]>(
    INVENTORY_SOURCES.map((s) => ({ ...s, success: null }))
  );
  const [totalSynced, setTotalSynced] = useState(0);

  const progress = syncing || completed 
    ? ((currentIndex + (completed ? 0 : 0)) / INVENTORY_SOURCES.length) * 100 
    : 0;

  async function startSync() {
    setSyncing(true);
    setCompleted(false);
    setCurrentIndex(0);
    setTotalSynced(0);
    setStatuses(INVENTORY_SOURCES.map((s) => ({ ...s, success: null })));

    let total = 0;

    for (let i = 0; i < INVENTORY_SOURCES.length; i++) {
      const source = INVENTORY_SOURCES[i];
      setCurrentIndex(i);

      try {
        const { data, error } = await supabase.functions.invoke("sync-auctions", {
          body: { type: source.type },
        });

        if (error) throw error;

        const count = data?.count || 0;
        total += count;

        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, success: true, count } : s
          )
        );
      } catch (err) {
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { ...s, success: false, error: err instanceof Error ? err.message : "Failed" }
              : s
          )
        );
      }

      setTotalSynced(total);
    }

    setCurrentIndex(INVENTORY_SOURCES.length);
    setSyncing(false);
    setCompleted(true);
    onSyncComplete?.();
  }

  function handleOpenChange(newOpen: boolean) {
    if (!syncing) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset state when closing
        setCompleted(false);
        setCurrentIndex(0);
        setStatuses(INVENTORY_SOURCES.map((s) => ({ ...s, success: null })));
      }
    }
  }

  const successCount = statuses.filter((s) => s.success === true).length;
  const failCount = statuses.filter((s) => s.success === false).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync All
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync All Inventory Sources</DialogTitle>
          <DialogDescription>
            Sync auction data from all {INVENTORY_SOURCES.length} GoDaddy inventory sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!syncing && !completed && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                This will fetch the latest auctions from all available inventory feeds.
              </p>
              <Button onClick={startSync} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Sync
              </Button>
            </div>
          )}

          {(syncing || completed) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {Math.min(currentIndex + (syncing ? 1 : 0), INVENTORY_SOURCES.length)} / {INVENTORY_SOURCES.length}
                  </span>
                </div>
                <Progress value={syncing ? ((currentIndex + 1) / INVENTORY_SOURCES.length) * 100 : 100} className="h-2" />
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2">
                {statuses.map((status, idx) => (
                  <div
                    key={status.type}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      status.success === true
                        ? "border-green-500/30 bg-green-500/5"
                        : status.success === false
                        ? "border-red-500/30 bg-red-500/5"
                        : idx === currentIndex && syncing
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {status.success === true && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {status.success === false && (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      {status.success === null && idx === currentIndex && syncing && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                      {status.success === null && (idx !== currentIndex || !syncing) && (
                        <div className="w-4 h-4 rounded-full border-2 border-muted" />
                      )}
                      <span className="text-sm">{status.label}</span>
                    </div>
                    {status.success === true && status.count !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {status.count.toLocaleString()}
                      </Badge>
                    )}
                    {status.success === false && (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {completed && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Auctions Synced</span>
                    <span className="font-bold text-lg">{totalSynced.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      {successCount} succeeded
                    </Badge>
                    {failCount > 0 && (
                      <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                        {failCount} failed
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}