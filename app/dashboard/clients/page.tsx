'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Trash2, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Client {
  id: string;
  name: string;
  phone_number: string;
  email_address: string | null;
  region: string | null;
  is_subscribed: boolean;
  created_at: string;
}

const regions = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

export default function ClientsPage() {
  const { merchant } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [region, setRegion] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const fetchClients = async () => {
    if (!merchant) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load clients');
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (merchant) {
      fetchClients();
    }
  }, [merchant]);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return `+27${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('27') && cleaned.length === 11) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 9) {
      return `+27${cleaned}`;
    }
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const { error: insertError } = await supabase.from('clients').insert({
        merchant_id: merchant.id,
        name: name.trim(),
        phone_number: formattedPhone,
        email_address: emailAddress.trim() || null,
        region: region || null,
        is_subscribed: true,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          throw new Error('A client with this phone number already exists');
        }
        throw insertError;
      }

      setName('');
      setPhoneNumber('');
      setEmailAddress('');
      setRegion('');
      setShowForm(false);
      setSuccess('Client added successfully');
      await fetchClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    setDeleting(clientToDelete.id);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (deleteError) throw deleteError;

      setDeleteDialogOpen(false);
      setClientToDelete(null);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-600">Manage your customer database</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
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
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Add New Client</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="082 123 4567"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">SA numbers will be formatted to +27</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-2">
                  Region (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none"
                  >
                    <option value="">Select region</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Client
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Your Clients</h2>
          <span className="text-sm text-slate-500">{clients.length} total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="mt-2 text-slate-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No clients yet</h3>
            <p className="text-slate-600 mb-6">Get started by adding your first client</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Marketing
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{client.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-mono text-sm">{client.phone_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 text-sm">
                        {client.email_address || <span className="text-slate-400">-</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 text-sm">
                        {client.region || <span className="text-slate-400">-</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {client.is_subscribed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Opted Out
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDeleteDialog(client)}
                        disabled={deleting === client.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === client.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${clientToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={deleting !== null}
      />
    </div>
  );
}
