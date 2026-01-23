import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

const TermsOfService = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service - ExpiredHawk</title>
        <meta name="description" content="ExpiredHawk Terms of Service - Read our terms and conditions for using our domain monitoring service." />
        <link rel="canonical" href="https://expiredhawk.com/terms" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 23, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using ExpiredHawk ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground">
                ExpiredHawk is a domain monitoring service that allows you to set up patterns and receive alerts when matching domains become available in GoDaddy auctions. We aggregate publicly available auction data and provide notification services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
              <p className="text-muted-foreground mb-4">To use our Service, you must:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate and complete registration information.</li>
                <li>Maintain the security of your account credentials.</li>
                <li>Be at least 18 years old or have legal capacity to enter into contracts.</li>
                <li>Promptly update your account information if it changes.</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Billing:</strong> Subscriptions are billed monthly in advance. All fees are in USD.</li>
                <li><strong>Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before the renewal date.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time through the Stripe Customer Portal. Access continues until the end of the current billing period.</li>
                <li><strong>Refunds:</strong> We do not offer refunds for partial months or unused subscription time.</li>
                <li><strong>Price Changes:</strong> We may change subscription prices with 30 days notice.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the Service for any unlawful purpose or to violate any laws.</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
                <li>Interfere with or disrupt the Service or servers.</li>
                <li>Use automated systems to access the Service in a manner that exceeds reasonable use.</li>
                <li>Resell or redistribute the Service without authorization.</li>
                <li>Use the Service to infringe on intellectual property rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Domain Information Disclaimer</h2>
              <p className="text-muted-foreground">
                The domain auction information provided through our Service is aggregated from third-party sources, primarily GoDaddy Auctions. We do not guarantee the accuracy, completeness, or timeliness of this information. Domain availability, pricing, and auction status may change at any time. We are not responsible for any decisions you make based on this information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and functionality are owned by ExpiredHawk and are protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without our express written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXPIREDHAWK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall survive.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting on our website or sending you an email. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ExpiredHawk operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:legal@expiredhawk.com" className="text-primary hover:underline">
                  legal@expiredhawk.com
                </a>
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default TermsOfService;
