import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface MaintenanceBannerProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function MaintenanceBanner({ onRetry, isRetrying }: MaintenanceBannerProps) {
  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between gap-4 text-amber-800 dark:text-amber-200">
        <span>
          We're experiencing temporary service issues. Sign-in may be slow or unavailable.
        </span>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
