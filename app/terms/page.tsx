import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-4">
              By accessing and using MerchantHub, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              MerchantHub provides business management tools including client management, invoicing,
              event ticketing, and payment processing integration. We reserve the right to modify,
              suspend, or discontinue any aspect of the service at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Accounts</h2>
            <p className="text-slate-700 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You agree to notify us immediately
              of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Payment Processing</h2>
            <p className="text-slate-700 mb-4">
              Payment processing is provided through third-party services (such as Ozow).
              You agree to comply with all applicable payment processor terms and conditions.
              We are not responsible for payment processing errors or disputes that arise from
              third-party payment services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. User Conduct</h2>
            <p className="text-slate-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the service</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Transmit any viruses, malware, or other malicious code</li>
              <li>Collect or harvest any information from other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-700 mb-4">
              All content, features, and functionality of MerchantHub are owned by us and are
              protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-700 mb-4">
              MerchantHub is provided &quot;as is&quot; without warranties of any kind. We shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Changes to Terms</h2>
            <p className="text-slate-700 mb-4">
              We reserve the right to modify these terms at any time. Continued use of the service
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Contact</h2>
            <p className="text-slate-700 mb-4">
              If you have questions about these Terms of Service, please contact us through the
              support channels provided in the application.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
