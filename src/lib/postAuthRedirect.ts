interface StoredPostAuthRedirect {
  path: string;
  savedAt: number;
}

const POST_AUTH_REDIRECT_STORAGE_KEY = "eh_post_auth_redirect";
const STORED_REDIRECT_MAX_AGE_MS = 10 * 60 * 1000;

export function stashPostAuthRedirect(path: string) {
  if (!path.startsWith("/")) return;

  const payload: StoredPostAuthRedirect = {
    path,
    savedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearPostAuthRedirect() {
  try {
    sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function consumePostAuthRedirect() {
  try {
    const raw = sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPostAuthRedirect;
    if (Date.now() - parsed.savedAt > STORED_REDIRECT_MAX_AGE_MS) {
      return null;
    }

    if (!parsed.path || !parsed.path.startsWith("/")) {
      return null;
    }

    return parsed.path;
  } catch {
    return null;
  }
}