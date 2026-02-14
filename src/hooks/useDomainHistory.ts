import { useState, useCallback } from "react";

const STORAGE_KEY = "expiredhawk_domain_history";
const MAX_ITEMS = 20;

export interface DomainHistoryItem {
  domain: string;
  checkedAt: string; // ISO string
}

function loadHistory(): DomainHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DomainHistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(items: DomainHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useDomainHistory() {
  const [history, setHistory] = useState<DomainHistoryItem[]>(loadHistory);

  const addDomain = useCallback((domain: string) => {
    setHistory((prev) => {
      const cleaned = domain.toLowerCase().trim();
      const filtered = prev.filter((h) => h.domain !== cleaned);
      const next = [{ domain: cleaned, checkedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addDomain, clearHistory };
}
