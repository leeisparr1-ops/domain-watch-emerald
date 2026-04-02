export interface StoredAuthCallbackPayload {
  hash: string;
  pathname: string;
  savedAt: number;
  search: string;
}

const AUTH_CALLBACK_STORAGE_KEY = "eh_auth_callback_payload";
const STORED_CALLBACK_MAX_AGE_MS = 10 * 60 * 1000;

let inMemoryPayload: StoredAuthCallbackPayload | null = null;

function hasAuthCallbackPayload(url: URL) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  return Boolean(
    hashParams.get("access_token") ||
      hashParams.get("refresh_token") ||
      url.searchParams.get("access_token") ||
      url.searchParams.get("refresh_token") ||
      url.searchParams.get("code") ||
      url.searchParams.get("error") ||
      url.searchParams.get("error_description")
  );
}

export function clearStoredAuthCallbackPayload() {
  inMemoryPayload = null;

  try {
    sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function stashAuthCallbackPayloadFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (url.pathname !== "/auth/callback" || !hasAuthCallbackPayload(url)) return;

  const payload: StoredAuthCallbackPayload = {
    hash: url.hash,
    pathname: url.pathname,
    savedAt: Date.now(),
    search: url.search,
  };

  inMemoryPayload = payload;

  try {
    sessionStorage.setItem(AUTH_CALLBACK_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }

  const next = url.searchParams.get("next");
  const cleanUrl = new URL(url.pathname, window.location.origin);

  if (next?.startsWith("/")) {
    cleanUrl.searchParams.set("next", next);
  }

  window.history.replaceState({}, "", cleanUrl.toString());
}

export function consumeStoredAuthCallbackPayload(): StoredAuthCallbackPayload | null {
  const fallbackPayload = inMemoryPayload;
  inMemoryPayload = null;

  try {
    const raw = sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);

    if (!raw) {
      return fallbackPayload;
    }

    const parsed = JSON.parse(raw) as StoredAuthCallbackPayload;
    if (Date.now() - parsed.savedAt > STORED_CALLBACK_MAX_AGE_MS) {
      return null;
    }

    return parsed;
  } catch {
    return fallbackPayload;
  }
}