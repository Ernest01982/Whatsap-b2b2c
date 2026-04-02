'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck as CheckCircle, ArrowRight, Receipt, Chrome as Home } from 'lucide-react';
import { Suspense } from 'react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('TransactionId');
  const amount = searchParams.get('Amount');
  const reference = searchParams.get('TransactionReference');

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Successful
          </h1>

          <p className="text-slate-600 mb-6">
            Thank you for your payment. Your transaction has been processed successfully.
          </p>

          {(amount || transactionId || reference) && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
              {amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Amount Paid</span>
                  <span className="font-semibold text-slate-900">R{parseFloat(amount).toFixed(2)}</span>
                </div>
              )}
              {reference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Reference</span>
                  <span className="font-mono text-sm text-slate-900">{reference}</span>
                </div>
              )}
              {transactionId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Transaction ID</span>
                  <span className="font-mono text-xs text-slate-700 break-all">{transactionId}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              A receipt has been sent to your phone via WhatsApp.
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-emerald-600">Loading...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
