import { useEffect, useCallback } from "react";

interface KeyboardShortcutOptions {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onToggleFavorite: () => void;
  onFocusSearch: () => void;
  onOpenDetail: () => void;
  enabled?: boolean;
}

export function useDashboardKeyboardShortcuts({
  onNavigateUp,
  onNavigateDown,
  onToggleFavorite,
  onFocusSearch,
  onOpenDetail,
  enabled = true,
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        // Only handle Escape to blur search
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "k":
        case "ArrowUp":
          e.preventDefault();
          onNavigateUp();
          break;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          onNavigateDown();
          break;
        case "f":
          e.preventDefault();
          onToggleFavorite();
          break;
        case "/":
          e.preventDefault();
          onFocusSearch();
          break;
        case "Enter":
          e.preventDefault();
          onOpenDetail();
          break;
      }
    },
    [enabled, onNavigateUp, onNavigateDown, onToggleFavorite, onFocusSearch, onOpenDetail]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
