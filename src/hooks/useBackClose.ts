import { useEffect, useRef, useCallback } from "react";

/**
 * Pushes a history entry when `open` becomes true.
 * On browser-back (mobile swipe), calls `onClose` instead of navigating away.
 * When closed programmatically, pops the extra history entry.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const closedByPopstate = useRef(false);

  useEffect(() => {
    if (open && !pushed.current) {
      pushed.current = true;
      closedByPopstate.current = false;
      window.history.pushState({ sheetOpen: true }, "");
    }

    if (!open && pushed.current) {
      pushed.current = false;
      // If closed programmatically (not via back swipe), pop the history entry
      if (!closedByPopstate.current) {
        window.history.back();
      }
      closedByPopstate.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handler = () => {
      if (pushed.current) {
        pushed.current = false;
        closedByPopstate.current = true;
        onClose();
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, onClose]);

  // Cleanup: if component unmounts while open, go back to remove the extra entry
  useEffect(() => {
    return () => {
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      }
    };
  }, []);
}
