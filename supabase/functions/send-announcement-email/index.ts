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
            <h1 style="color: white; margin: 0; font-size: 32px;">🦅 Expired Hawk</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Thank You for Being an Early User 🎯</h2>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              Hi there,
            </p>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              We wanted to reach out personally to thank you for being one of the first users of <strong>Expired Hawk</strong>.
            </p>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              Over the past week, we've been making significant improvements behind the scenes — faster domain syncing, smarter pattern matching, and improved notifications. During this process, you may have experienced some brief disruptions, and we sincerely apologize for any inconvenience.
            </p>
            
            <h3 style="color: #1f2937; font-size: 18px; margin-top: 24px;">Here's what's improved:</h3>
            
            <div style="background: white; padding: 16px 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="color: #4b5563; margin: 8px 0; font-size: 15px;">⚡ <strong>Faster syncs</strong> — Domain data now updates more efficiently</p>
              <p style="color: #4b5563; margin: 8px 0; font-size: 15px;">🔔 <strong>Better notifications</strong> — You'll now be alerted as soon as a matching domain is discovered, as there were delays before</p>
              <p style="color: #4b5563; margin: 8px 0; font-size: 15px;">🛡️ <strong>Improved reliability</strong> — We've resolved the sync timeout issues</p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              We're committed to making Expired Hawk the best tool for finding expired domains, and your early support means the world to us. If you ever have feedback or suggestions, drop us an email at <a href="mailto:support@expiredhawk.com" style="color: #22c55e; font-weight: 600;">support@expiredhawk.com</a> — we read every message.
            </p>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
              Happy hunting! 🎯
            </p>
            
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 0;">
              — The Expired Hawk Team
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            © ${new Date().getFullYear()} Expired Hawk - Domain Monitoring Made Simple
          </p>
        </div>
      `;

      try {
        console.log(`Sending announcement email to: ${user.email}`);
        
        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          to: [user.email],
          subject: "Thank You for Being an Early Expired Hawk User 🦅",
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
