export interface StoredAuthCallbackPayload {
  hash: string;
  pathname: string;
  savedAt: number;
  search: string;
}

const AUTH_CALLBACK_STORAGE_KEY = "eh_auth_callback_payload";
const STORED_CALLBACK_MAX_AGE_MS = 10 * 60 * 1000;
const AUTH_ERROR_PARAM_NAMES = new Set(["error", "error_description"]);
const AUTH_TOKEN_PARAM_NAMES = new Set([
  "access_token",
  "code",
  "expires_at",
  "expires_in",
  "provider_refresh_token",
  "provider_token",
  "refresh_token",
  "state",
  "token_type",
]);

let inMemoryPayload: StoredAuthCallbackPayload | null = null;

function hasAuthCallbackPayload(url: URL) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hasTokenPayload = [...AUTH_TOKEN_PARAM_NAMES].some(
    (paramName) => hashParams.has(paramName) || url.searchParams.has(paramName)
  );
  const hasAuthRoutePayload =
    url.pathname === "/auth/callback" &&
    ([...AUTH_ERROR_PARAM_NAMES].some(
      (paramName) => hashParams.has(paramName) || url.searchParams.has(paramName)
    ) || url.searchParams.has("next"));

  return hasTokenPayload || hasAuthRoutePayload;
}

function preserveNonAuthParams(params: URLSearchParams) {
  const nextParams = new URLSearchParams();

  params.forEach((value, key) => {
    if (!AUTH_TOKEN_PARAM_NAMES.has(key) && !AUTH_ERROR_PARAM_NAMES.has(key)) {
      nextParams.append(key, value);
    }
  });

  return nextParams;
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
  if (!hasAuthCallbackPayload(url)) return;

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

  const cleanUrl = new URL(url.pathname, window.location.origin);
  const preservedSearch = preserveNonAuthParams(url.searchParams);
  const preservedHash = preserveNonAuthParams(new URLSearchParams(url.hash.replace(/^#/, "")));
  const search = preservedSearch.toString();
  const hash = preservedHash.toString();

  cleanUrl.search = search ? `?${search}` : "";
  cleanUrl.hash = hash ? `#${hash}` : "";

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