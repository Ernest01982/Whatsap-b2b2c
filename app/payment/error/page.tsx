'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TriangleAlert as AlertTriangle, Chrome as Home, RefreshCw, MessageCircle } from 'lucide-react';
import { Suspense } from 'react';

function PaymentErrorContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('TransactionReference');
  const statusMessage = searchParams.get('StatusMessage');

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Failed
          </h1>

          <p className="text-slate-600 mb-6">
            We were unable to process your payment. Please try again or use a different payment method.
          </p>

          {(reference || statusMessage) && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
              {reference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Reference</span>
                  <span className="font-mono text-sm text-slate-900">{reference}</span>
                </div>
              )}
              {statusMessage && (
                <div>
                  <span className="text-sm text-slate-600 block mb-1">Error Details</span>
                  <span className="text-sm text-red-700">{statusMessage}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">
              Common reasons for payment failure include insufficient funds, incorrect bank details, or a temporary bank issue.
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

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-red-600">Loading...</div>
      </div>
    }>
      <PaymentErrorContent />
    </Suspense>
  );
}
