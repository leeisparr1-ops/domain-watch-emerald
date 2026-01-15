import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SyncHistoryEntry {
  id: string;
  inventory_source: string;
  synced_at: string;
  auctions_count: number;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
}

export function SyncHistoryPanel() {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, lastSync: '' });

  async function fetchHistory() {
    setLoading(true);
    try {
      // Fetch recent sync history (last 50 entries)
      const { data, error } = await supabase
        .from('sync_history')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setHistory(data);
        
        // Calculate stats
        const successful = data.filter(h => h.success).length;
        const failed = data.filter(h => !h.success).length;
        const lastSync = data.length > 0 ? data[0].synced_at : '';
        
        setStats({
          total: data.length,
          successful,
          failed,
          lastSync
        });
      }
    } catch (err) {
      console.error('Error fetching sync history:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const successRate = stats.total > 0 
    ? Math.round((stats.successful / stats.total) * 100) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl glass border border-border overflow-hidden"
    >
      {/* Header - Always visible */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Sync History</h3>
            {stats.lastSync && (
              <p className="text-sm text-muted-foreground">
                Last sync: {formatRelativeTime(stats.lastSync)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Stats badges */}
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {stats.successful}
            </Badge>
            {stats.failed > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 border-destructive/50">
                <XCircle className="w-3 h-3 text-destructive" />
                {stats.failed}
              </Badge>
            )}
            <Badge 
              variant={successRate >= 90 ? "default" : successRate >= 70 ? "secondary" : "destructive"}
              className="font-mono"
            >
              {successRate}% success
            </Badge>
          </div>
          
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchHistory(); }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border"
        >
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading sync history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No sync history yet. Run a sync to see results here.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Auctions</th>
                    <th className="px-4 py-2 font-medium text-right">Duration</th>
                    <th className="px-4 py-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {entry.inventory_source}
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        {entry.success ? (
                          <span className="flex items-center gap-1 text-green-500 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive text-sm" title={entry.error_message || undefined}>
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        {entry.auctions_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(entry.duration_ms)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                        {formatRelativeTime(entry.synced_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Error details for failed syncs */}
          {history.some(h => !h.success && h.error_message) && (
            <div className="border-t border-border p-4">
              <h4 className="text-sm font-medium text-destructive mb-2">Recent Errors</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {history
                  .filter(h => !h.success && h.error_message)
                  .slice(0, 5)
                  .map(entry => (
                    <div key={entry.id} className="text-sm bg-destructive/10 rounded p-2">
                      <span className="font-medium">{entry.inventory_source}:</span>{' '}
                      <span className="text-muted-foreground">{entry.error_message}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}