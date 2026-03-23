'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CalendarDays, Plus, Eye, Loader as Loader2, CircleAlert as AlertCircle, Ticket, Users, Clock } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_date: string;
  ticket_price: number;
  capacity: number;
  created_at: string;
  tickets_sold: number;
}

export default function EventsPage() {
  const { merchant } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    if (!merchant) return;

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, ticket_price, capacity, created_at')
      .eq('merchant_id', merchant.id)
      .order('event_date', { ascending: true });

    if (eventsError) {
      setError('Failed to load events');
      setLoading(false);
      return;
    }

    const eventsWithCounts = await Promise.all(
      (eventsData || []).map(async (event) => {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .in('status', ['Paid', 'Scanned']);

        return {
          ...event,
          tickets_sold: count || 0,
        };
      })
    );

    setEvents(eventsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    if (merchant) {
      fetchEvents();
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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  const upcomingEvents = events.filter((e) => isUpcoming(e.event_date));
  const pastEvents = events.filter((e) => !isUpcoming(e.event_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Events & Tickets</h1>
            <p className="text-slate-600">Manage events and sell tickets</p>
          </div>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Event
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-slate-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No events yet</h3>
          <p className="text-slate-600 mb-6">Create your first event to start selling tickets</p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">
                          {event.name}
                        </h3>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full whitespace-nowrap ml-2">
                          Upcoming
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays className="w-4 h-4" />
                          <span>{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(event.event_date)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="font-mono font-medium text-slate-900">
                            {formatCurrency(event.ticket_price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Sold</p>
                          <p className="font-medium text-emerald-600">
                            {event.tickets_sold}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Capacity</p>
                          <p className="font-medium text-slate-900">{event.capacity}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{
                              width: `${Math.min(
                                (event.tickets_sold / event.capacity) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-right">
                          {event.capacity - event.tickets_sold} remaining
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex items-center justify-center gap-2 w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Past Events</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Ticket Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Tickets Sold
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pastEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{event.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-700">{formatDate(event.event_date)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-slate-700">
                            {formatCurrency(event.ticket_price)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">
                              {event.tickets_sold} / {event.capacity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
