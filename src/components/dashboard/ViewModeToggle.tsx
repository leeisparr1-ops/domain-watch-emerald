import { Heart, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViewModeToggleProps {
  viewMode: "all" | "favorites" | "matches";
  onViewChange: (mode: "all" | "favorites" | "matches") => void;
  favoritesCount: number;
  totalMatchesCount: number;
}

export function ViewModeToggle({ viewMode, onViewChange, favoritesCount, totalMatchesCount }: ViewModeToggleProps) {
  return (
    <div className="mb-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => onViewChange("all")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
              viewMode === "all" 
                ? "bg-background text-foreground shadow-sm" 
                : "hover:bg-background/50"
            }`}
          >
            <span className="hidden sm:inline">All Domains</span>
            <span className="sm:hidden">All</span>
          </button>
          <button
            onClick={() => onViewChange("favorites")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
              viewMode === "favorites" 
                ? "bg-background text-foreground shadow-sm" 
                : "hover:bg-background/50"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Favorites</span>
            {favoritesCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {favoritesCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => onViewChange("matches")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
              viewMode === "matches" 
                ? "bg-background text-foreground shadow-sm" 
                : "hover:bg-background/50"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Matches</span>
            {totalMatchesCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs bg-primary">
                {totalMatchesCount}
              </Badge>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
