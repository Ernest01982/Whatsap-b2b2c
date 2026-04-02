'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FileText, ArrowLeft, Loader as Loader2, CircleAlert as AlertCircle, User, Phone, Mail, Trash2, Send, MessageCircle, Copy, CircleCheck as CheckCircle, ExternalLink } from 'lucide-react';

interface InvoiceItem {
  id: string;
  quantity: number;
  line_total: number;
  services: {
    name: string;
    price: number;
    pricing_type: string;
  } | null;
}

interface Invoice {
  id: string;
  status: 'Draft' | 'Pending Deposit' | 'Pending Final' | 'Paid' | 'Cancelled';
  total_amount: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  created_at: string;
  clients: {
    name: string;
    phone_number: string;
    email_address: string | null;
  };
  invoice_items: InvoiceItem[];
}

const statusStyles: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  'Pending Deposit': 'bg-amber-100 text-amber-700',
  'Pending Final': 'bg-blue-100 text-blue-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { merchant } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!merchant || !params.id) return;

      const { data, error } = await supabase
        .from('quotes_invoices')
        .select(`
          id,
          status,
          total_amount,
          deposit_amount,
          amount_paid,
          balance_due,
          created_at,
          clients (
            name,
            phone_number,
            email_address
          ),
          invoice_items (
            id,
            quantity,
            line_total,
            services (
              name,
              price,
              pricing_type
            )
          )
        `)
        .eq('id', params.id)
        .eq('merchant_id', merchant.id)
        .maybeSingle();

      if (error) {
        setError('Failed to load invoice');
      } else if (!data) {
        setError('Invoice not found');
      } else {
        setInvoice(data as unknown as Invoice);
      }
      setLoading(false);
    };

    if (merchant) {
      fetchInvoice();
    }
  }, [merchant, params.id]);

  const handleDelete = async () => {
    if (!invoice || !confirm('Are you sure you want to delete this invoice?')) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('quotes_invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;

      router.push('/dashboard/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const generatePaymentLink = async (paymentType: 'deposit' | 'final') => {
    if (!invoice) return;

    setSendingPayment(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          payment_type: paymentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      setPaymentUrl(data.payment_url);
      setShowSendOptions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payment link');
    } finally {
      setSendingPayment(false);
    }
  };

  const getWhatsAppMessage = () => {
    if (!invoice || !paymentUrl || !merchant) return '';

    const amount = invoice.deposit_amount > 0 && invoice.amount_paid === 0
      ? invoice.deposit_amount
      : invoice.balance_due;

    const paymentType = invoice.deposit_amount > 0 && invoice.amount_paid === 0 ? 'deposit' : 'balance';

    return `Hi ${invoice.clients?.name},\n\nThis is a payment request from ${merchant.business_name}.\n\nAmount due (${paymentType}): R${amount.toFixed(2)}\n\nPay securely here:\n${paymentUrl}\n\nThank you for your business!`;
  };

  const openWhatsApp = () => {
    if (!invoice?.clients?.phone_number || !paymentUrl) return;

    let phone = invoice.clients.phone_number.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '27' + phone.substring(1);
    } else if (!phone.startsWith('27') && phone.length === 9) {
      phone = '27' + phone;
    }
    const message = encodeURIComponent(getWhatsAppMessage());
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`, '_blank');
  };

  const copyPaymentLink = async () => {
    if (!paymentUrl) return;

    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = paymentUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyFullMessage = async () => {
    const message = getWhatsAppMessage();

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Invoice Details</h1>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Invoice Details</h1>
              <p className="text-slate-600">Created {formatDate(invoice.created_at)}</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusStyles[invoice.status]}`}>
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <User className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Client Information</h2>
          </div>
          <div className="p-6 space-y-3">
            <p className="font-medium text-lg text-slate-900">{invoice.clients?.name}</p>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4" />
              <span className="font-mono text-sm">{invoice.clients?.phone_number}</span>
            </div>
            {invoice.clients?.email_address && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{invoice.clients.email_address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Payment Summary</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            {invoice.deposit_amount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Deposit Required</span>
                  <span className="font-mono text-amber-700">
                    {formatCurrency(invoice.deposit_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Balance After Deposit</span>
                  <span className="font-mono text-slate-700">
                    {formatCurrency(invoice.total_amount - invoice.deposit_amount)}
                  </span>
                </div>
              </>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between">
              <span className="font-medium text-slate-700">Amount Paid</span>
              <span className="font-mono font-medium text-emerald-600">
                {formatCurrency(invoice.amount_paid)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-700">Balance Due</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.balance_due)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.invoice_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{item.services?.name || 'Deleted Service'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-mono text-slate-700">
                      {item.services ? formatCurrency(item.services.price) : '-'}
                      {item.services?.pricing_type !== 'Fixed' &&
                        item.services &&
                        ` / ${item.services.pricing_type === 'Per Hour' ? 'hr' : 'm²'}`}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{item.quantity}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-mono font-medium text-slate-900">
                      {formatCurrency(item.line_total)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right font-semibold text-slate-700">
                  Total
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="font-mono font-bold text-lg text-slate-900">
                    {formatCurrency(invoice.total_amount)}
                  </p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Send Payment Request</h2>
            <p className="text-sm text-slate-600 mt-1">Generate a payment link and send it via your own WhatsApp</p>
          </div>
          <div className="p-6">
            {!showSendOptions ? (
              <div className="flex flex-wrap gap-3">
                {invoice.deposit_amount > 0 && invoice.amount_paid === 0 && (
                  <button
                    onClick={() => generatePaymentLink('deposit')}
                    disabled={sendingPayment}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Request Deposit ({formatCurrency(invoice.deposit_amount)})
                  </button>
                )}
                {invoice.balance_due > 0 && (invoice.amount_paid > 0 || invoice.deposit_amount === 0) && (
                  <button
                    onClick={() => generatePaymentLink('final')}
                    disabled={sendingPayment}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Request Final Payment ({formatCurrency(invoice.balance_due)})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Payment link generated!</span>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">Payment Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-white border border-slate-200 rounded px-3 py-2 overflow-x-auto">
                      {paymentUrl}
                    </code>
                    <button
                      onClick={copyPaymentLink}
                      className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Send to client:</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={openWhatsApp}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Open WhatsApp
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={copyFullMessage}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Full Message
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Click &quot;Open WhatsApp&quot; to send via your WhatsApp account, or copy the message to send manually.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSendOptions(false);
                    setPaymentUrl(null);
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Generate new link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete Invoice
        </button>
      </div>
    </div>
  );
}
