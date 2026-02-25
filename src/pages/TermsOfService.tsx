import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

const TermsOfService = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service - ExpiredHawk</title>
        <meta name="description" content="ExpiredHawk Terms of Service - Read our terms and conditions for using our domain monitoring and analysis service." />
        <link rel="canonical" href="https://expiredhawk.com/terms" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 16, 2026</p>

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
                ExpiredHawk is a domain investment platform that provides domain monitoring, AI-powered analysis, portfolio tracking, and notification services. Key features include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li><strong>Pattern Monitoring:</strong> Set up rules to match expiring domains from auction and closeout inventories.</li>
                <li><strong>AI Domain Advisor:</strong> AI-powered investment analysis including buy/sell verdicts, flip scores, valuations, and conversational follow-up.</li>
                <li><strong>Domain Tools:</strong> Brandability Scorer, Valuation Estimator, Pronounceability Scorer, AI Name Generator, Bulk Checker, TLD Comparison, and Domain Report Card.</li>
                <li><strong>Portfolio Tracker:</strong> Manage domain investments with purchase/sale tracking and P&L reporting.</li>
                <li><strong>Alerts:</strong> Push and email notifications for pattern matches.</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We aggregate publicly available auction data from domain marketplaces and provide analytical tools to assist with investment decisions.
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
                <li><strong>Free Plan:</strong> Includes limited pattern monitoring (30 patterns) and access to domain tools.</li>
                <li><strong>Paid Plans:</strong> Basic ($4.99/mo) and Advanced ($9.99/mo) plans offer increased pattern limits, priority notifications, and full tool access.</li>
                <li><strong>Billing:</strong> Subscriptions are billed monthly in advance. All fees are in USD.</li>
                <li><strong>Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before the renewal date.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Access continues until the end of the current billing period.</li>
                <li><strong>Refunds:</strong> We do not offer refunds for partial months or unused subscription time.</li>
                <li><strong>Price Changes:</strong> We may change subscription prices with 30 days notice.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. AI-Generated Content Disclaimer</h2>
              <p className="text-muted-foreground">
                The AI Domain Advisor and related tools provide AI-generated analysis, valuations, and investment suggestions. This content is for informational purposes only and does not constitute financial, investment, or legal advice. AI-generated valuations, flip scores, and buy/sell verdicts are estimates based on algorithmic analysis and may not reflect actual market conditions. You should conduct your own due diligence before making any domain purchase or investment decision. ExpiredHawk is not responsible for any financial losses resulting from reliance on AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the Service for any unlawful purpose or to violate any laws.</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
                <li>Interfere with or disrupt the Service or servers.</li>
                <li>Use automated systems to access the Service in a manner that exceeds reasonable use.</li>
                <li>Resell or redistribute the Service without authorization.</li>
                <li>Use the Service to infringe on intellectual property rights, including cybersquatting.</li>
                <li>Abuse the AI Domain Advisor for purposes unrelated to domain analysis.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Domain Information Disclaimer</h2>
              <p className="text-muted-foreground">
                The domain auction information provided through our Service is aggregated from third-party sources. We do not guarantee the accuracy, completeness, or timeliness of this information. Domain availability, pricing, and auction status may change at any time. Spam risk scores, trademark risk indicators, and domain age estimates are provided as-is and may not be fully accurate. We are not responsible for any decisions you make based on this information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and functionality are owned by ExpiredHawk and are protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without our express written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXPIREDHAWK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO RELIANCE ON AI-GENERATED ANALYSIS OR DOMAIN VALUATIONS. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. AI-GENERATED CONTENT IS PROVIDED WITHOUT WARRANTY OF ACCURACY OR COMPLETENESS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service will immediately cease. Your portfolio data may be deleted after account termination. Provisions that by their nature should survive termination shall survive.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting on our website or sending you an email. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ExpiredHawk operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:support@expiredhawk.com" className="text-primary hover:underline">
                  support@expiredhawk.com
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