import Link from 'next/link';
import { FileText, Ticket, CreditCard, Users, Shield, Smartphone, ArrowRight, CircleCheck as CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">MerchantHub</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Manage Your Business
                <span className="block text-emerald-600">All in One Place</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
                Streamline your invoicing, manage clients, and sell event tickets with instant EFT payments. Built for South African businesses.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Start Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl border border-slate-200 transition-colors text-lg"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Everything You Need</h2>
              <p className="mt-4 text-lg text-slate-600">Powerful tools designed for South African merchants</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Invoicing</h3>
                <p className="text-slate-600">
                  Create professional quotes and invoices. Send payment requests via WhatsApp with one click.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Instant EFT Payments</h3>
                <p className="text-slate-600">
                  Accept payments instantly via Ozow. No card machines, no waiting for funds.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <Ticket className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Event Ticketing</h3>
                <p className="text-slate-600">
                  Sell tickets for events with QR code verification. Works offline at the gate.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Client Management</h3>
                <p className="text-slate-600">
                  Keep track of all your customers in one place. Segment by region for targeted communication.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Secure & Private</h3>
                <p className="text-slate-600">
                  Your data is isolated and protected. Each business has their own secure space.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Works Offline</h3>
                <p className="text-slate-600">
                  Install as an app on your phone. Scan tickets even without internet connection.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to streamline your business?
              </h2>
              <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                Join merchants across South Africa who are using MerchantHub to manage their invoices, payments, and events.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Create Your Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                <CreditCard className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-slate-900">MerchantHub</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy Policy
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Built for South African businesses
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
