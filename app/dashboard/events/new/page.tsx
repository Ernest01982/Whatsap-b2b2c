'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CalendarDays, ArrowLeft, Loader as Loader2, CircleAlert as AlertCircle, Clock, Users, DollarSign, Type } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const { merchant } = useAuth();

  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchant) {
      setError('Not authenticated');
      return;
    }

    if (!name.trim() || !eventDate || !capacity || !ticketPrice) {
      setError('Please fill in all fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('events').insert({
        merchant_id: merchant.id,
        name: name.trim(),
        event_date: new Date(eventDate).toISOString(),
        capacity: parseInt(capacity),
        ticket_price: parseFloat(ticketPrice),
      });

      if (insertError) throw insertError;

      router.push('/dashboard/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-slate-900">Create New Event</h1>
            <p className="text-slate-600">Set up a new ticketed event</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Event Details</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Type className="w-4 h-4" />
                Event Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer Music Festival"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4" />
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={getMinDateTime()}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Users className="w-4 h-4" />
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Maximum number of tickets available
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4" />
                  Ticket Price (ZAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="e.g., 150.00"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Price per ticket in South African Rand
                </p>
              </div>
            </div>
          </div>
        </div>

        {name && eventDate && capacity && ticketPrice && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Event Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Event</p>
                <p className="font-medium text-slate-900 truncate">{name}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Date</p>
                <p className="font-medium text-slate-900">
                  {new Date(eventDate).toLocaleDateString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Capacity</p>
                <p className="font-medium text-slate-900">{capacity}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Price</p>
                <p className="font-mono font-medium text-emerald-600">
                  R{parseFloat(ticketPrice).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600">
                Potential Revenue:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  R{(parseFloat(ticketPrice) * parseInt(capacity)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard/events"
            className="px-6 py-3 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !name || !eventDate || !capacity || !ticketPrice}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarDays className="w-5 h-5" />
                Create Event
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
