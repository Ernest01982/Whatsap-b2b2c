'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Circle as XCircle, ArrowLeft, RefreshCw, Chrome as Home } from 'lucide-react';
import { Suspense } from 'react';

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('TransactionReference');

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Cancelled
          </h1>

          <p className="text-slate-600 mb-6">
            Your payment was cancelled. No charges have been made to your account.
          </p>

          {reference && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Reference</span>
                <span className="font-mono text-sm text-slate-900">{reference}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">
              If you experienced any issues, please contact the merchant directly.
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              Return Home
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Powered by MerchantHub
        </p>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-amber-600">Loading...</div>
      </div>
    }>
      <PaymentCancelledContent />
    </Suspense>
  );
}
