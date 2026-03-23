'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CalendarDays, ArrowLeft, Loader as Loader2, CircleAlert as AlertCircle, Users, Ticket, Phone, DollarSign, Plus, Trash2, X, Check, Download, QrCode } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_date: string;
  ticket_price: number;
  capacity: number;
}

interface TicketWithClient {
  id: string;
  status: 'Reserved' | 'Paid' | 'Scanned';
  created_at: string;
  clients: {
    id: string;
    name: string;
    phone_number: string;
  };
}

interface Client {
  id: string;
  name: string;
  phone_number: string;
}

const statusStyles: Record<string, string> = {
  Reserved: 'bg-slate-100 text-slate-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Scanned: 'bg-blue-100 text-blue-700',
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { merchant } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<TicketWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addingTicket, setAddingTicket] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!merchant || !params.id) return;

    const [eventRes, ticketsRes, clientsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date, ticket_price, capacity')
        .eq('id', params.id)
        .eq('merchant_id', merchant.id)
        .maybeSingle(),
      supabase
        .from('tickets')
        .select(`
          id,
          status,
          created_at,
          clients (
            id,
            name,
            phone_number
          )
        `)
        .eq('event_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name, phone_number')
        .eq('merchant_id', merchant.id)
        .order('name'),
    ]);

    if (eventRes.error) {
      setError('Failed to load event');
    } else if (!eventRes.data) {
      setError('Event not found');
    } else {
      setEvent(eventRes.data);
      setTickets((ticketsRes.data as unknown as TicketWithClient[]) || []);
      setClients(clientsRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (merchant) {
      fetchData();
    }
  }, [merchant, params.id]);

  const paidTickets = tickets.filter((t) => t.status === 'Paid' || t.status === 'Scanned');
  const totalRevenue = paidTickets.length * (event?.ticket_price || 0);
  const remainingCapacity = (event?.capacity || 0) - paidTickets.length;

  const handleAddTicket = async () => {
    if (!event || !selectedClientId) return;

    setAddingTicket(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('tickets').insert({
        event_id: event.id,
        client_id: selectedClientId,
        status: 'Paid',
      });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setSelectedClientId('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ticket');
    } finally {
      setAddingTicket(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !confirm('Are you sure you want to delete this event? All tickets will also be deleted.')) return;

    setDeleting(true);

    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      router.push('/dashboard/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      setDeleting(false);
    }
  };

  const handleExportForOffline = () => {
    if (!event) return;

    const offlineData = {
      event: {
        id: event.id,
        name: event.name,
        event_date: event.event_date,
        ticket_price: event.ticket_price,
      },
      tickets: tickets.map((t) => ({
        id: t.id,
        status: t.status,
        client_name: t.clients?.name || 'Unknown',
        client_phone: t.clients?.phone_number || '',
      })),
      exported_at: new Date().toISOString(),
    };

    localStorage.setItem(`offline_event_${event.id}`, JSON.stringify(offlineData));
    setExportSuccess(`Database exported! ${tickets.length} tickets saved for offline scanning.`);

    setTimeout(() => setExportSuccess(''), 5000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-slate-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/events"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Event Details</h1>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || 'Event not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/events"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
              <p className="text-slate-600">
                {formatDate(event.event_date)} at {formatTime(event.event_date)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportForOffline}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download for Offline
          </button>
          <Link
            href={`/offline-scanner/${event.id}`}
            className="flex items-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Open Scanner
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={remainingCapacity <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Attendee
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {exportSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{exportSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-600">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-600">Tickets Sold</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {paidTickets.length}
            <span className="text-sm font-normal text-slate-500 ml-1">/ {event.capacity}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-600">Remaining</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{remainingCapacity}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-sm text-slate-600">Ticket Price</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(event.ticket_price)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Attendees</h2>
          <span className="text-sm text-slate-500">{tickets.length} total</span>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No attendees yet</h3>
            <p className="text-slate-600 mb-6">Add attendees manually or share the event link</p>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={remainingCapacity <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add First Attendee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ticket Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ticket ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{ticket.clients?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span className="font-mono text-sm">{ticket.clients?.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[ticket.status]}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded font-mono">
                        {ticket.id.substring(0, 8).toUpperCase()}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleDeleteEvent}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete Event
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Add Attendee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Add an existing client as a paid attendee for this event.
              </p>

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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Client
                  </label>
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
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTicket}
                disabled={addingTicket || !selectedClientId}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingTicket ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Add Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
