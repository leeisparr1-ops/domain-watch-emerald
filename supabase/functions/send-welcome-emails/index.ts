import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_HEADERS = {
  "List-Unsubscribe": "<https://expiredhawk.com/settings>",
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching all users to send welcome emails...");

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to send welcome emails to`);

    const results: { email: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      const text = `Welcome to ExpiredHawk!\n\nThank you for joining. You've joined the smartest way to discover and monitor expired domain auctions.\n\nGet Started in 3 Steps:\n1. Create patterns – Set up keyword patterns to match domains you're interested in\n2. Enable notifications – Get instant alerts when matching domains appear\n3. Discover opportunities – Browse the latest auctions and find your perfect domain\n\nOur system automatically syncs with major domain auction platforms, so you'll never miss an opportunity again.\n\nGo to your dashboard: https://expiredhawk.com/dashboard\n\nQuestions? Email us at support@expiredhawk.com\n\nTo manage your email preferences: https://expiredhawk.com/settings`;

      const welcomeHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 32px;">ExpiredHawk</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">Welcome aboard</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Thank You for Joining ExpiredHawk</h2>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              We're glad to have you as part of the ExpiredHawk community. You've joined the smartest way to discover and monitor expired domain auctions.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 24px 0;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">Get Started in 3 Steps:</h3>
              <ol style="color: #4b5563; line-height: 2; padding-left: 20px; margin-bottom: 0;">
                <li><strong>Create patterns</strong> – Set up keyword patterns to match domains you're interested in</li>
                <li><strong>Enable notifications</strong> – Get instant alerts when matching domains appear</li>
                <li><strong>Discover opportunities</strong> – Browse the latest auctions and find your perfect domain</li>
              </ol>
            </div>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              Our system automatically syncs with major domain auction platforms, so you'll never miss an opportunity again.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://expiredhawk.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Go to Your Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 24px; padding: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
              Questions? We're here to help.
            </p>
            <a href="mailto:support@expiredhawk.com" style="color: #22c55e; text-decoration: none; font-weight: 500;">support@expiredhawk.com</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            ExpiredHawk – Domain Monitoring Made Simple<br>
            <a href="https://expiredhawk.com/settings" style="color: #9ca3af;">Manage email preferences</a>
          </p>
        </div>
      `;

      try {
        console.log(`Sending welcome email to: ${user.email}`);

        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          replyTo: "support@expiredhawk.com",
          to: [user.email],
          subject: "Welcome to ExpiredHawk – Thank You for Joining",
          html: welcomeHtml,
          text,
          headers: EMAIL_HEADERS,
        });

        if (emailResponse?.error) {
          console.error(`Failed to send to ${user.email}:`, emailResponse.error);
          results.push({ email: user.email, success: false, error: emailResponse.error?.message });
          failCount++;
        } else {
          console.log(`Welcome email sent to ${user.email}`);
          results.push({ email: user.email, success: true });
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (err: any) {
        console.error(`Error sending to ${user.email}:`, err.message);
        results.push({ email: user.email, success: false, error: err.message });
        failCount++;
      }
    }

    console.log(`Welcome emails complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: users.length,
        successCount,
        failCount,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
