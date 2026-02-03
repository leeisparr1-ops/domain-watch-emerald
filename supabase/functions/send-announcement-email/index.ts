import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching all users to send announcement emails...");

    // Get all users from auth
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to send announcement emails to`);

    const results: { email: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      const announcementHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🦅 ExpiredHawk</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">New Features Just Launched!</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">🎉 Exciting Updates for You!</h2>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              We've been working hard to make ExpiredHawk even better. Here's what's new:
            </p>
            
            <!-- Free Plan Upgrade -->
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 24px 0;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">🆓 Free Plan Now Includes 5 Patterns!</h3>
              <p style="color: #4b5563; line-height: 1.7; font-size: 15px; margin-bottom: 0;">
                Great news for our free users — you can now create <strong>up to 5 domain patterns</strong> to monitor! 
                Set up alerts for keywords, prefixes, suffixes, or even regex patterns and get notified when matching domains go to auction.
              </p>
            </div>
            
            <!-- Spam Risk Detection -->
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 24px 0;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">🛡️ NEW: Spam Risk Detection</h3>
              <p style="color: #4b5563; line-height: 1.7; font-size: 15px;">
                Avoid domains with a bad history! We now check domains against major spam and phishing databases including <strong>SURBL</strong> and <strong>Spamhaus DBL</strong>.
              </p>
              <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin-bottom: 0; font-size: 15px;">
                <li><span style="color: #22c55e; font-weight: 600;">🟢 Clean</span> – No issues detected</li>
                <li><span style="color: #eab308; font-weight: 600;">🟡 Medium Risk</span> – Some concerns found</li>
                <li><span style="color: #ef4444; font-weight: 600;">🔴 High Risk</span> – Domain flagged on blocklists</li>
              </ul>
              <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 12px; margin-bottom: 0;">
                Just click on any domain in your dashboard to see its spam risk status!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://expiredhawk.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Try It Now →
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 24px; padding: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
              Thank you for being part of ExpiredHawk!
            </p>
            <a href="mailto:support@expiredhawk.com" style="color: #22c55e; text-decoration: none; font-weight: 500;">support@expiredhawk.com</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            © ${new Date().getFullYear()} ExpiredHawk - Domain Monitoring Made Simple
          </p>
        </div>
      `;

      try {
        console.log(`Sending announcement email to: ${user.email}`);
        
        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          to: [user.email],
          subject: "🚀 New Features: 5 Free Patterns + Spam Risk Detection!",
          html: announcementHtml,
        });

        if (emailResponse?.error) {
          console.error(`Failed to send to ${user.email}:`, emailResponse.error);
          results.push({ email: user.email, success: false, error: emailResponse.error?.message });
          failCount++;
        } else {
          console.log(`Announcement email sent to ${user.email}`);
          results.push({ email: user.email, success: true });
          successCount++;
        }

        // Delay to avoid rate limiting from Resend (2 requests/sec max)
        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (err: any) {
        console.error(`Error sending to ${user.email}:`, err.message);
        results.push({ email: user.email, success: false, error: err.message });
        failCount++;
      }
    }

    console.log(`Announcement emails complete. Success: ${successCount}, Failed: ${failCount}`);

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
    console.error("Error in send-announcement-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
