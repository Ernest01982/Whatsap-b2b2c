'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader as Loader2, CircleAlert as AlertCircle, CreditCard, Shield } from 'lucide-react';
import {
  generatePayfastSignature,
  PAYFAST_SANDBOX_URL,
  PAYFAST_PRODUCTION_URL,
  PAYFAST_SANDBOX_MERCHANT_ID,
  PAYFAST_SANDBOX_MERCHANT_KEY,
  PAYFAST_SANDBOX_PASSPHRASE,
  PayfastPaymentData,
} from '@/lib/payfast';

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  total_amount: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  clients: {
    name: string;
    email_address: string | null;
  } | null;
  merchants: {
    business_name: string;
    payfast_merchant_id: string | null;
    payfast_merchant_key: string | null;
    payfast_passphrase: string | null;
    payfast_sandbox_mode: boolean | null;
  } | null;
}

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.invoice_id as string;
  const paymentType = searchParams.get('type') || 'final';
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [paymentData, setPaymentData] = useState<PayfastPaymentData | null>(null);
  const [payfastUrl, setPayfastUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('quotes_invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            deposit_amount,
            amount_paid,
            balance_due,
            status,
            clients (name, email_address),
            merchants (
              business_name,
              payfast_merchant_id,
              payfast_merchant_key,
              payfast_passphrase,
              payfast_sandbox_mode
            )
          `)
          .eq('id', invoiceId)
          .maybeSingle();

        if (invoiceError) throw invoiceError;
        if (!invoiceData) {
          setError('Invoice not found');
          setLoading(false);
          return;
        }

        setInvoice(invoiceData as unknown as InvoiceData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice. Please try again.');
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const preparePayment = () => {
    if (!invoice) return;

    const merchant = invoice.merchants;

    const useSandbox = merchant?.payfast_sandbox_mode ?? true;
    const merchantId = useSandbox
      ? PAYFAST_SANDBOX_MERCHANT_ID
      : (merchant?.payfast_merchant_id || PAYFAST_SANDBOX_MERCHANT_ID);
    const merchantKey = useSandbox
      ? PAYFAST_SANDBOX_MERCHANT_KEY
      : (merchant?.payfast_merchant_key || PAYFAST_SANDBOX_MERCHANT_KEY);
    const passphrase = useSandbox
      ? PAYFAST_SANDBOX_PASSPHRASE
      : (merchant?.payfast_passphrase || undefined);

    if (!merchantId || !merchantKey) {
      setError('Payment gateway not configured. Please contact the merchant.');
      return;
    }

    const isDeposit = paymentType === 'deposit';
    const amountToPay = isDeposit && invoice.deposit_amount > 0 && invoice.amount_paid === 0
      ? invoice.deposit_amount
      : invoice.balance_due;

    if (amountToPay <= 0) {
      setError('This invoice has already been paid.');
      return;
    }

    const baseUrl = window.location.origin;
    const itemName = invoice.invoice_number
      ? `Invoice ${invoice.invoice_number}${isDeposit ? ' - Deposit' : ''}`
      : `Invoice Payment${isDeposit ? ' - Deposit' : ''}`;

    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl}/payment/success?invoice_id=${invoiceId}`,
      cancel_url: `${baseUrl}/payment/cancelled?invoice_id=${invoiceId}`,
      notify_url: `${baseUrl}/api/webhooks/payfast`,
      name_first: invoice.clients?.name?.split(' ')[0] || 'Customer',
      m_payment_id: invoiceId,
      amount: amountToPay.toFixed(2),
      item_name: itemName,
      item_description: `Payment for ${merchant?.business_name || 'services'}`,
    };

    if (invoice.clients?.email_address) {
      data.email_address = invoice.clients.email_address;
    }

    const signature = generatePayfastSignature(data, passphrase);

    setPaymentData({
      ...data,
      signature,
    } as PayfastPaymentData);

    setPayfastUrl(useSandbox ? PAYFAST_SANDBOX_URL : PAYFAST_PRODUCTION_URL);
    setShowDetails(false);
  };

  useEffect(() => {
    if (paymentData && formRef.current && !submitted) {
      setSubmitted(true);
      setTimeout(() => {
        formRef.current?.submit();
      }, 1000);
    }
  }, [paymentData, submitted]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Loading Invoice</h1>
          <p className="text-slate-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment Error</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  if (invoice?.status === 'Paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Already Paid</h1>
          <p className="text-slate-600 mb-6">This invoice has already been paid. Thank you!</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  if (showDetails && invoice) {
    const isDeposit = paymentType === 'deposit' && invoice.deposit_amount > 0 && invoice.amount_paid === 0;
    const amountDue = isDeposit ? invoice.deposit_amount : invoice.balance_due;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="bg-emerald-600 px-6 py-8 text-center">
            <h1 className="text-white text-xl font-semibold mb-1">
              {invoice.merchants?.business_name || 'Invoice Payment'}
            </h1>
            {invoice.invoice_number && (
              <p className="text-emerald-100 text-sm">Invoice #{invoice.invoice_number}</p>
            )}
            {!invoice.invoice_number && (
              <p className="text-emerald-100 text-sm">Secure Payment</p>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-1">
                {isDeposit ? 'Deposit Amount Due' : 'Amount Due'}
              </p>
              <p className="text-4xl font-bold text-slate-900">
                {formatCurrency(amountDue)}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Invoice Total</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
              {invoice.deposit_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Deposit Required</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(invoice.deposit_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Amount Paid</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(invoice.amount_paid || 0)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-medium text-slate-900">
                  {isDeposit ? 'Deposit Due' : 'Balance Due'}
                </span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>

            <button
              onClick={preparePayment}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Pay {isDeposit ? 'Deposit' : 'Now'} with PayFast
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4" />
              <span>Secured by PayFast</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Redirecting to PayFast</h1>
        <p className="text-slate-600 mb-4">
          You are being redirected to PayFast to complete your payment of{' '}
          <span className="font-semibold">{paymentData?.amount ? `R ${paymentData.amount}` : ''}</span>
        </p>
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">
          If you are not redirected automatically,{' '}
          <button
            onClick={() => formRef.current?.submit()}
            className="text-emerald-600 hover:underline font-medium"
          >
            click here
          </button>
        </p>
      </div>

      {paymentData && (
        <form
          ref={formRef}
          action={payfastUrl}
          method="POST"
          className="hidden"
        >
          <input type="hidden" name="merchant_id" value={paymentData.merchant_id} />
          <input type="hidden" name="merchant_key" value={paymentData.merchant_key} />
          <input type="hidden" name="return_url" value={paymentData.return_url} />
          <input type="hidden" name="cancel_url" value={paymentData.cancel_url} />
          <input type="hidden" name="notify_url" value={paymentData.notify_url} />
          <input type="hidden" name="name_first" value={paymentData.name_first} />
          {paymentData.email_address && (
            <input type="hidden" name="email_address" value={paymentData.email_address} />
          )}
          <input type="hidden" name="m_payment_id" value={paymentData.m_payment_id} />
          <input type="hidden" name="amount" value={paymentData.amount} />
          <input type="hidden" name="item_name" value={paymentData.item_name} />
          <input type="hidden" name="item_description" value={paymentData.item_description} />
          {paymentData.signature && (
            <input type="hidden" name="signature" value={paymentData.signature} />
          )}
        </form>
      )}
    </div>
  );
}
