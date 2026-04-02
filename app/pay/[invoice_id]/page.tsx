'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader as Loader2, CircleAlert as AlertCircle, CreditCard } from 'lucide-react';

interface PaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  signature?: string;
}

async function generateMD5(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer).catch(() => null);

  if (!hashBuffer) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  const sortedKeys = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address', 'payment_method'
  ];

  const params: string[] = [];
  for (const key of sortedKeys) {
    if (data[key] !== undefined && data[key] !== '') {
      params.push(`${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`);
    }
  }

  if (passphrase) {
    params.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`);
  }

  const paramString = params.join('&');

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(paramString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PaymentPage() {
  const params = useParams();
  const invoiceId = params.invoice_id as string;
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [payfastUrl, setPayfastUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchInvoiceAndPreparePayment() {
      try {
        const { data: invoice, error: invoiceError } = await supabase
          .from('quotes_invoices')
          .select(`
            *,
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
        if (!invoice) {
          setError('Invoice not found');
          setLoading(false);
          return;
        }

        const merchant = invoice.merchants;
        if (!merchant?.payfast_merchant_id || !merchant?.payfast_merchant_key) {
          setError('Payment gateway not configured. Please contact the merchant.');
          setLoading(false);
          return;
        }

        const balanceDue = invoice.balance_due || invoice.total_amount;
        if (balanceDue <= 0) {
          setError('This invoice has already been paid.');
          setLoading(false);
          return;
        }

        const baseUrl = window.location.origin;
        const sandboxMode = merchant.payfast_sandbox_mode ?? true;

        const data: Record<string, string> = {
          merchant_id: merchant.payfast_merchant_id,
          merchant_key: merchant.payfast_merchant_key,
          return_url: `${baseUrl}/payment/success?invoice_id=${invoiceId}`,
          cancel_url: `${baseUrl}/payment/cancelled?invoice_id=${invoiceId}`,
          notify_url: `${baseUrl}/api/webhooks/payfast`,
          name_first: invoice.clients?.name?.split(' ')[0] || 'Customer',
          email_address: invoice.clients?.email_address || '',
          m_payment_id: invoiceId,
          amount: balanceDue.toFixed(2),
          item_name: `Invoice Payment`,
          item_description: `Payment for ${merchant.business_name || 'services'}`,
        };

        const signature = await generateSignature(data, merchant.payfast_passphrase || undefined);

        setPaymentData({
          ...data,
          signature,
        } as PaymentData);

        setPayfastUrl(sandboxMode
          ? 'https://sandbox.payfast.co.za/eng/process'
          : 'https://www.payfast.co.za/eng/process'
        );

        setLoading(false);
      } catch (err) {
        console.error('Error preparing payment:', err);
        setError('Failed to prepare payment. Please try again.');
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoiceAndPreparePayment();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (paymentData && formRef.current && !submitted) {
      setSubmitted(true);
      setTimeout(() => {
        formRef.current?.submit();
      }, 1500);
    }
  }, [paymentData, submitted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Preparing Payment</h1>
          <p className="text-slate-600">Please wait while we set up your secure payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-6 h-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Redirecting to PayFast</h1>
        <p className="text-slate-600 mb-4">
          You are being redirected to PayFast to complete your payment of{' '}
          <span className="font-semibold">R {paymentData?.amount}</span>
        </p>
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">
          If you are not redirected automatically,{' '}
          <button
            onClick={() => formRef.current?.submit()}
            className="text-emerald-600 hover:underline"
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
