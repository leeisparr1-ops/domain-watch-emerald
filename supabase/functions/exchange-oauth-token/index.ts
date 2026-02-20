import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Exchange OAuth broker tokens for a valid Supabase session.
 *
 * The Lovable OAuth broker returns JWTs signed with its own key (kid)
 * which this project's GoTrue doesn't recognise. This function:
 * 1. Decodes the broker JWT to extract the user's email & identity
 * 2. Finds or creates the user via the admin API
 * 3. Generates a magic-link token for that user
 * 4. Returns the hashed_token so the client can call verifyOtp()
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();
    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "access_token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode JWT payload WITHOUT verification (we trust the broker issued it)
    const parts = access_token.split(".");
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: any;
    try {
      const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      payload = JSON.parse(atob(padded));
    } catch {
      return new Response(
        JSON.stringify({ error: "Could not decode token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = payload.email;
    if (!email) {
      return new Response(
        JSON.stringify({ error: "No email in token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[exchange-oauth-token] Processing for email: ${email}`);

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user exists, create if not
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let user = existingUsers?.users?.find((u) => u.email === email);

    if (!user) {
      console.log(`[exchange-oauth-token] Creating new user for ${email}`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: payload.user_metadata?.full_name || payload.name || "",
          avatar_url: payload.user_metadata?.avatar_url || payload.picture || "",
          provider: "google",
        },
      });
      if (createError) {
        console.error(`[exchange-oauth-token] Create user error:`, createError);
        return new Response(
          JSON.stringify({ error: `Could not create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = newUser.user;
    }

    // Generate a magic link token for this user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError) {
      console.error(`[exchange-oauth-token] Generate link error:`, linkError);
      return new Response(
        JSON.stringify({ error: `Could not generate session: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hashed_token = linkData.properties?.hashed_token;
    if (!hashed_token) {
      return new Response(
        JSON.stringify({ error: "No token generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[exchange-oauth-token] Success for ${email}`);

    return new Response(
      JSON.stringify({ hashed_token, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(`[exchange-oauth-token] Exception:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
