'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOfflineSync } from '@/contexts/offline-sync-context';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, Trash2, Loader as Loader2, CircleAlert as AlertCircle, ArrowLeft, User, Calculator, Save, Send, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { OfflineBanner } from '@/components/offline-banner';

interface Client {
  id: string;
  name: string;
  phone_number: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  pricing_type: 'Fixed' | 'Per Hour' | 'Per Sqm';
}

interface LineItem {
  id: string;
  service_id: string;
  service_name: string;
  price: number;
  pricing_type: 'Fixed' | 'Per Hour' | 'Per Sqm';
  quantity: number;
  line_total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { merchant, session } = useAuth();
  const { isOnline, addOfflineInvoice } = useOfflineSync();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedClientId, setSelectedClientId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState(50);

  useEffect(() => {
    const fetchData = async () => {
      if (!merchant) return;

      const cachedClients = localStorage.getItem(`cached_clients_${merchant.id}`);
      const cachedServices = localStorage.getItem(`cached_services_${merchant.id}`);

      if (cachedClients && cachedServices && !isOnline) {
        setClients(JSON.parse(cachedClients));
        setServices(JSON.parse(cachedServices));
        setLoading(false);
        return;
      }

      const [clientsRes, servicesRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, phone_number')
          .eq('merchant_id', merchant.id)
          .order('name'),
        supabase
          .from('services')
          .select('id, name, price, pricing_type')
          .eq('merchant_id', merchant.id)
          .order('name'),
      ]);

      if (clientsRes.error || servicesRes.error) {
        if (cachedClients && cachedServices) {
          setClients(JSON.parse(cachedClients));
          setServices(JSON.parse(cachedServices));
        } else {
          setError('Failed to load data');
        }
      } else {
        setClients(clientsRes.data || []);
        setServices(servicesRes.data || []);
        localStorage.setItem(`cached_clients_${merchant.id}`, JSON.stringify(clientsRes.data || []));
        localStorage.setItem(`cached_services_${merchant.id}`, JSON.stringify(servicesRes.data || []));
      }
      setLoading(false);
    };

    if (merchant) {
      fetchData();
    }
  }, [merchant, isOnline]);

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.line_total, 0);
  }, [lineItems]);

  const depositAmount = useMemo(() => {
    if (!requireDeposit) return 0;
    return (totalAmount * depositPercentage) / 100;
  }, [totalAmount, requireDeposit, depositPercentage]);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      service_id: '',
      service_name: '',
      price: 0,
      pricing_type: 'Fixed',
      quantity: 1,
      line_total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const quantity = service.pricing_type === 'Fixed' ? 1 : item.quantity || 1;
          return {
            ...item,
            service_id: service.id,
            service_name: service.name,
            price: service.price,
            pricing_type: service.pricing_type,
            quantity,
            line_total: service.price * quantity,
          };
        }
        return item;
      })
    );
  };

  const updateQuantity = (id: string, quantity: number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const qty = Math.max(0.01, quantity);
          return {
            ...item,
            quantity: qty,
            line_total: item.price * qty,
          };
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const handleSave = async (status: 'Draft' | 'Pending Deposit' | 'Pending Final') => {
    if (!merchant || !selectedClientId) {
      setError('Please select a client');
      return;
    }

    if (lineItems.length === 0 || lineItems.some((item) => !item.service_id)) {
      setError('Please add at least one service');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    const invoiceStatus = requireDeposit && status !== 'Draft' ? 'Pending Deposit' : status === 'Draft' ? 'Draft' : 'Pending Final';

    if (!isOnline && status !== 'Draft') {
      const offlineInvoice = {
        id: crypto.randomUUID(),
        client_id: selectedClientId,
        items: lineItems.map((item) => ({
          service_id: item.service_id,
          quantity: item.quantity,
          line_total: item.line_total,
        })),
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        created_at: new Date().toISOString(),
      };

      addOfflineInvoice(offlineInvoice);
      setSuccessMessage('You are offline. Invoice saved to Outbox and will send when signal returns.');
      setSaving(false);

      setTimeout(() => {
        router.push('/dashboard/invoices');
      }, 2000);
      return;
    }

    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('quotes_invoices')
        .insert({
          merchant_id: merchant.id,
          client_id: selectedClientId,
          status: invoiceStatus,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          amount_paid: 0,
          balance_due: requireDeposit ? depositAmount : totalAmount,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = lineItems.map((item) => ({
        invoice_id: invoice.id,
        service_id: item.service_id,
        quantity: item.quantity,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      if (status !== 'Draft' && session?.access_token) {
        try {
          await fetch('/api/invoices/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ invoice_id: invoice.id }),
          });
        } catch {
          console.log('WhatsApp send failed, invoice still created');
        }
      }

      router.push('/dashboard/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <div className="max-w-4xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-bold text-slate-900">New Quote/Invoice</h1>
              <p className="text-slate-600">Create a new document for your client</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{successMessage}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <User className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Select Client</h2>
          </div>
          <div className="p-6">
            {clients.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-600 mb-4">No clients found. Add a client first.</p>
                <Link
                  href="/dashboard/clients"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Go to Clients
                </Link>
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
              >
                <option value="">Choose a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.phone_number})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold text-slate-900">Line Items</h2>
            </div>
            <button
              onClick={addLineItem}
              disabled={services.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>
          <div className="p-6">
            {services.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-600 mb-4">No services found. Add services first.</p>
                <Link
                  href="/dashboard/services"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Go to Services
                </Link>
              </div>
            ) : lineItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No line items added yet</p>
                <button
                  onClick={addLineItem}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Service
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Service #{index + 1}
                      </label>
                      <select
                        value={item.service_id}
                        onChange={(e) => updateLineItem(item.id, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-sm"
                      >
                        <option value="">Select a service...</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} - {formatCurrency(service.price)}
                            {service.pricing_type !== 'Fixed' &&
                              ` / ${service.pricing_type === 'Per Hour' ? 'hr' : 'm2'}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full md:w-32">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {item.pricing_type === 'Per Hour'
                          ? 'Hours'
                          : item.pricing_type === 'Per Sqm'
                          ? 'Sqm'
                          : 'Qty'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                        disabled={item.pricing_type === 'Fixed'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    <div className="w-full md:w-32">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Line Total
                      </label>
                      <p className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm text-slate-700">
                        {formatCurrency(item.line_total)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="self-end md:self-center p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <Calculator className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Totals & Deposit</h2>
          </div>
          <div className="p-6">
            <div className="max-w-md ml-auto space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700">Subtotal</span>
                <span className="font-mono text-lg text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="p-4 border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">Require Deposit?</p>
                    <p className="text-sm text-slate-500">Client pays upfront before work begins</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireDeposit(!requireDeposit)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      requireDeposit ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        requireDeposit ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {requireDeposit && (
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Deposit Percentage
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={depositPercentage}
                        onChange={(e) => setDepositPercentage(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="w-16 text-right font-mono text-slate-700">
                        {depositPercentage}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {requireDeposit && (
                <>
                  <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="font-medium text-amber-800">Deposit Amount</span>
                    <span className="font-mono text-lg text-amber-900">{formatCurrency(depositAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Balance Due After Deposit</span>
                    <span className="font-mono text-lg text-slate-900">{formatCurrency(totalAmount - depositAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="font-semibold text-emerald-800">Total Amount</span>
                <span className="font-mono text-xl font-bold text-emerald-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard/invoices"
            className="w-full sm:w-auto px-6 py-3 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            onClick={() => handleSave('Draft')}
            disabled={saving || !selectedClientId || lineItems.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('Pending Final')}
            disabled={saving || !selectedClientId || lineItems.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !isOnline ? (
              <WifiOff className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {!isOnline ? 'Save to Outbox' : 'Save & Prepare to Send'}
          </button>
        </div>
      </div>
    </>
  );
}
