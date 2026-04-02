'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Settings, Building2, CreditCard, ToggleLeft, Save, Loader as Loader2, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Eye, EyeOff, FileText, Ticket } from 'lucide-react';

export default function SettingsPage() {
  const { merchant, refreshMerchant } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [featureInvoicing, setFeatureInvoicing] = useState(true);
  const [featureTicketing, setFeatureTicketing] = useState(false);

  const [payfastMerchantId, setPayfastMerchantId] = useState('');
  const [payfastMerchantKey, setPayfastMerchantKey] = useState('');
  const [payfastPassphrase, setPayfastPassphrase] = useState('');
  const [payfastSandboxMode, setPayfastSandboxMode] = useState(true);

  const [showMerchantKey, setShowMerchantKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.business_name || '');
      setFeatureInvoicing(merchant.feature_invoicing);
      setFeatureTicketing(merchant.feature_ticketing);
      setPayfastMerchantId(merchant.payfast_merchant_id || '');
      setPayfastMerchantKey(merchant.payfast_merchant_key || '');
      setPayfastPassphrase(merchant.payfast_passphrase || '');
      setPayfastSandboxMode(merchant.payfast_sandbox_mode ?? true);
    }
  }, [merchant]);

  const handleSave = async () => {
    if (!merchant) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('merchants')
        .update({
          business_name: businessName,
          feature_invoicing: featureInvoicing,
          feature_ticketing: featureTicketing,
          payfast_merchant_id: payfastMerchantId || null,
          payfast_merchant_key: payfastMerchantKey || null,
          payfast_passphrase: payfastPassphrase || null,
          payfast_sandbox_mode: payfastSandboxMode,
        })
        .eq('id', merchant.id);

      if (updateError) throw updateError;

      await refreshMerchant();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const fillSandboxCredentials = () => {
    setPayfastMerchantId('10044182');
    setPayfastMerchantKey('52uzfor1jhxxj');
    setPayfastPassphrase('');
    setPayfastSandboxMode(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600">Manage your business profile and integrations</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">Settings saved successfully</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Business Profile</h2>
        </div>
        <div className="p-6">
          <label htmlFor="businessName" className="block text-sm font-medium text-slate-700 mb-2">
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            placeholder="Enter your business name"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <ToggleLeft className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Features</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900">Invoicing Module</p>
                <p className="text-sm text-slate-600">Create quotes and invoices for clients</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeatureInvoicing(!featureInvoicing)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                featureInvoicing ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  featureInvoicing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-slate-900">Ticketing Module</p>
                <p className="text-sm text-slate-600">Manage events and sell tickets</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeatureTicketing(!featureTicketing)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                featureTicketing ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  featureTicketing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="font-semibold text-slate-900">PayFast Payment Integration</h2>
              <p className="text-sm text-slate-500">Configure your PayFast payment gateway credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillSandboxCredentials}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Use Sandbox Credentials
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-amber-900">Sandbox Mode</p>
                <p className="text-sm text-amber-700">
                  {payfastSandboxMode
                    ? 'Test payments only - no real transactions'
                    : 'Live mode - real payments will be processed'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayfastSandboxMode(!payfastSandboxMode)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                payfastSandboxMode ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  payfastSandboxMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="payfastMerchantId" className="block text-sm font-medium text-slate-700 mb-2">
              Merchant ID
            </label>
            <input
              id="payfastMerchantId"
              type="text"
              value={payfastMerchantId}
              onChange={(e) => setPayfastMerchantId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
              placeholder="Your PayFast Merchant ID"
            />
          </div>

          <div>
            <label htmlFor="payfastMerchantKey" className="block text-sm font-medium text-slate-700 mb-2">
              Merchant Key
            </label>
            <div className="relative">
              <input
                id="payfastMerchantKey"
                type={showMerchantKey ? 'text' : 'password'}
                value={payfastMerchantKey}
                onChange={(e) => setPayfastMerchantKey(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                placeholder="Your PayFast Merchant Key"
              />
              <button
                type="button"
                onClick={() => setShowMerchantKey(!showMerchantKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showMerchantKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="payfastPassphrase" className="block text-sm font-medium text-slate-700 mb-2">
              Passphrase <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                id="payfastPassphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={payfastPassphrase}
                onChange={(e) => setPayfastPassphrase(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                placeholder="Your PayFast Passphrase (if enabled)"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Get your credentials from the{' '}
            <a
              href="https://www.payfast.co.za/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              PayFast Dashboard
            </a>
            {' '}or use the sandbox credentials for testing.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
