import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - ExpiredHawk</title>
        <meta name="description" content="ExpiredHawk Privacy Policy - Learn how we collect, use, and protect your personal information." />
        <link rel="canonical" href="https://expiredhawk.com/privacy" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 23, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Account Information:</strong> Email address and password when you create an account.</li>
                <li><strong>Domain Patterns:</strong> Search patterns and preferences you configure for domain monitoring.</li>
                <li><strong>Payment Information:</strong> Payment details processed securely through Stripe. We do not store your full credit card numbers.</li>
                <li><strong>Notification Preferences:</strong> Push notification tokens and email preferences for alerts.</li>
                <li><strong>Usage Data:</strong> Information about how you use our service, including favorited domains and alert history.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our domain monitoring services.</li>
                <li>Send you alerts when domains matching your patterns become available.</li>
                <li>Process payments and manage your subscription.</li>
                <li>Send you technical notices, updates, and support messages.</li>
                <li>Respond to your comments, questions, and customer service requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties except:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Service Providers:</strong> We share information with Stripe for payment processing and notification services for delivering alerts.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights.</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted in transit and at rest. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access and receive a copy of your personal data.</li>
                <li>Rectify inaccurate personal data.</li>
                <li>Request deletion of your personal data.</li>
                <li>Object to or restrict processing of your personal data.</li>
                <li>Withdraw consent at any time where we rely on consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use essential cookies for authentication and session management. We do not use third-party tracking cookies for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Push Notifications</h2>
              <p className="text-muted-foreground">
                When you enable push notifications, we store a unique token to send you domain alerts. You can disable push notifications at any time through your browser or device settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at{" "}
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

export default PrivacyPolicy;
