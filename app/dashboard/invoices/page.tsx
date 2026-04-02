'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FileText, Plus, Eye, Loader as Loader2, CircleAlert as AlertCircle, Download, Mail, MessageCircle, ExternalLink, X, Copy, CircleCheck as CheckCircle } from 'lucide-react';

interface Invoice {
  id: string;
  client_id: string;
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
}

const statusStyles: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  'Pending Deposit': 'bg-amber-100 text-amber-700',
  'Pending Final': 'bg-blue-100 text-blue-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function InvoicesPage() {
  const { merchant, session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchInvoices = async () => {
    if (!merchant) return;

    const { data, error } = await supabase
      .from('quotes_invoices')
      .select(`
        id,
        client_id,
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
        )
      `)
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load invoices');
    } else {
      setInvoices((data as unknown as Invoice[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (merchant) {
      fetchInvoices();
    }
  }, [merchant]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    if (!session?.access_token) return;

    setActionLoading(`pdf-${invoiceId}`);
    setError('');

    try {
      const response = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceId.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmailInvoice = async (invoiceId: string, hasEmail: boolean) => {
    if (!session?.access_token) return;

    if (!hasEmail) {
      setError('This client does not have an email address. Please update their contact information first.');
      return;
    }

    setActionLoading(`email-${invoiceId}`);
    setError('');

    try {
      const response = await fetch('/api/invoices/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      alert(`Invoice sent successfully to ${data.sent_to}`);
    } catch (err) {
      console.error('Email send error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setActionLoading(null);
    }
  };

  const getPaymentUrl = (invoiceId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/pay/${invoiceId}`;
  };

  const getWhatsAppMessage = (invoice: Invoice) => {
    if (!merchant) return '';

    const paymentUrl = getPaymentUrl(invoice.id);
    const amount = invoice.deposit_amount > 0 && invoice.amount_paid === 0
      ? invoice.deposit_amount
      : invoice.balance_due;
    const paymentType = invoice.deposit_amount > 0 && invoice.amount_paid === 0 ? 'deposit' : 'balance';

    return `Hi ${invoice.clients?.name},

This is an invoice from ${merchant.business_name}.

Total Amount: ${formatCurrency(invoice.total_amount)}
Amount Due (${paymentType}): ${formatCurrency(amount)}

Pay securely here:
${paymentUrl}

Thank you for your business!`;
  };

  const openWhatsApp = (invoice: Invoice) => {
    if (!invoice.clients?.phone_number) return;

    const phone = invoice.clients.phone_number.replace(/\D/g, '');
    const fullPhone = phone.startsWith('27') ? phone : `27${phone.replace(/^0/, '')}`;
    const message = encodeURIComponent(getWhatsAppMessage(invoice));
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
  };

  const copyPaymentLink = async (invoice: Invoice) => {
    const paymentUrl = getPaymentUrl(invoice.id);

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

  const copyFullMessage = async (invoice: Invoice) => {
    const message = getWhatsAppMessage(invoice);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quotes & Invoices</h1>
            <p className="text-slate-600">Create and manage quotes and invoices</p>
          </div>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Quote/Invoice
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All Quotes & Invoices</h2>
          <span className="text-sm text-slate-500">{invoices.length} total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="mt-2 text-slate-600">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No quotes or invoices yet</h3>
            <p className="text-slate-600 mb-6">Create your first quote to get started</p>
            <Link
              href="/dashboard/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Quote
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{formatDate(invoice.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{invoice.clients?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-mono">{formatCurrency(invoice.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </Link>
                        <button
                          onClick={() => handleDownloadPDF(invoice.id)}
                          disabled={actionLoading === `pdf-${invoice.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {actionLoading === `pdf-${invoice.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                          onClick={() => setShareModal(invoice)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                        <button
                          onClick={() => handleEmailInvoice(invoice.id, !!invoice.clients?.email_address)}
                          disabled={actionLoading === `email-${invoice.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          title={invoice.clients?.email_address ? "Email to Client" : "No email address"}
                        >
                          {actionLoading === `email-${invoice.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Email</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Share Invoice</h3>
              <button
                onClick={() => setShareModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Client</p>
                <p className="font-medium text-slate-900">{shareModal.clients?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Amount Due</p>
                <p className="font-medium text-slate-900">
                  {formatCurrency(
                    shareModal.deposit_amount > 0 && shareModal.amount_paid === 0
                      ? shareModal.deposit_amount
                      : shareModal.balance_due
                  )}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-2">Payment Link:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-slate-200 rounded px-2 py-1.5 overflow-x-auto">
                    {getPaymentUrl(shareModal.id)}
                  </code>
                  <button
                    onClick={() => copyPaymentLink(shareModal)}
                    className="flex items-center gap-1 px-2 py-1.5 text-slate-700 hover:bg-slate-200 rounded transition-colors"
                    title="Copy link"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openWhatsApp(shareModal)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send via WhatsApp
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copyFullMessage(shareModal)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Full Message'}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Opens WhatsApp with a pre-filled message containing the payment link
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
