import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
            <p className="text-slate-700 mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Account information (email address, password)</li>
              <li>Business information (business name, contact details)</li>
              <li>Client information that you add to the platform</li>
              <li>Invoice and transaction data</li>
              <li>Event and ticketing information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Information Sharing</h2>
            <p className="text-slate-700 mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties
              except as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Payment processors (Ozow) to process payments</li>
              <li>Messaging services (WhatsApp) to send notifications</li>
              <li>Cloud service providers for data storage</li>
              <li>As required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
            <p className="text-slate-700 mb-4">
              We implement appropriate security measures to protect your personal information,
              including encryption of data in transit and at rest, secure authentication,
              and regular security assessments. However, no method of transmission over the
              Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Retention</h2>
            <p className="text-slate-700 mb-4">
              We retain your information for as long as your account is active or as needed
              to provide you services. You may request deletion of your account and associated
              data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Your Rights</h2>
            <p className="text-slate-700 mb-4">Under POPIA (Protection of Personal Information Act), you have the right to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to processing of your information</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Cookies</h2>
            <p className="text-slate-700 mb-4">
              We use cookies and similar tracking technologies to maintain your session and
              preferences. You can configure your browser to reject cookies, but this may
              affect your ability to use some features of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Changes to This Policy</h2>
            <p className="text-slate-700 mb-4">
              We may update this privacy policy from time to time. We will notify you of
              any changes by posting the new policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Contact Us</h2>
            <p className="text-slate-700 mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your
              rights regarding your personal information, please contact us through the
              support channels provided in the application.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
