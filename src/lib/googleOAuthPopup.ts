import { lovable } from "@/integrations/lovable/index";

/**
 * Backwards-compatible wrapper for Google sign-in.
 *
 * We intentionally use Lovable Cloud's managed OAuth flow here instead of the
 * older token-exchange workaround, which was timing out against the auth
 * backend and preventing users from signing in.
 */
export async function signInWithGooglePopup(): Promise<{ error: Error | null }> {
  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${window.location.pathname}`,
      extraParams: {
        prompt: "select_account",
      },
    });

    if (result.error) {
      return {
        error: result.error instanceof Error ? result.error : new Error(String(result.error)),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
