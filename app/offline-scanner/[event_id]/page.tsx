'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { QrCode, ArrowLeft, WifiOff, Wifi, Cloud, Loader as Loader2, Check, X, Search, Users, Ticket } from 'lucide-react';

interface OfflineTicket {
  id: string;
  status: 'Reserved' | 'Paid' | 'Scanned';
  client_name: string;
  client_phone: string;
}

interface OfflineEventData {
  event: {
    id: string;
    name: string;
    event_date: string;
    ticket_price: number;
  };
  tickets: OfflineTicket[];
  exported_at: string;
}

type ScanResult = 'valid' | 'already_scanned' | 'not_found' | null;

export default function OfflineScannerPage() {
  const params = useParams();
  const { session } = useAuth();
  const eventId = params.event_id as string;

  const [isOnline, setIsOnline] = useState(true);
  const [eventData, setEventData] = useState<OfflineEventData | null>(null);
  const [tickets, setTickets] = useState<OfflineTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [scanInput, setScanInput] = useState('');
  const [lastScanned, setLastScanned] = useState<OfflineTicket | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [showFlash, setShowFlash] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadOfflineData = () => {
      const stored = localStorage.getItem(`offline_event_${eventId}`);
      if (stored) {
        try {
          const data: OfflineEventData = JSON.parse(stored);
          setEventData(data);
          setTickets(data.tickets);
        } catch {
          setError('Failed to load offline data');
        }
      } else {
        setError('No offline data found. Please export the event first from the dashboard.');
      }
      setLoading(false);
    };

    loadOfflineData();
  }, [eventId]);

  const handleScan = useCallback((input: string) => {
    const ticketId = input.trim().toUpperCase();
    if (!ticketId) return;

    const ticket = tickets.find(
      (t) => t.id.toUpperCase() === ticketId || t.id.substring(0, 8).toUpperCase() === ticketId
    );

    setShowFlash(true);

    if (!ticket) {
      setScanResult('not_found');
      setLastScanned(null);
    } else if (ticket.status === 'Scanned') {
      setScanResult('already_scanned');
      setLastScanned(ticket);
    } else if (ticket.status === 'Paid') {
      const updatedTickets = tickets.map((t) =>
        t.id === ticket.id ? { ...t, status: 'Scanned' as const } : t
      );
      setTickets(updatedTickets);

      if (eventData) {
        const updatedData = { ...eventData, tickets: updatedTickets };
        localStorage.setItem(`offline_event_${eventId}`, JSON.stringify(updatedData));
      }

      setScanResult('valid');
      setLastScanned({ ...ticket, status: 'Scanned' });
    } else {
      setScanResult('not_found');
      setLastScanned(ticket);
    }

    setScanInput('');

    setTimeout(() => {
      setShowFlash(false);
    }, 1500);

    inputRef.current?.focus();
  }, [tickets, eventData, eventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(scanInput);
  };

  const handleSyncToCloud = async () => {
    if (!isOnline || !session?.access_token) {
      setSyncResult('You must be online and logged in to sync');
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const scannedTickets = tickets.filter((t) => t.status === 'Scanned');

      if (scannedTickets.length === 0) {
        setSyncResult('No scanned tickets to sync');
        setSyncing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const ticket of scannedTickets) {
        const { error } = await supabase
          .from('tickets')
          .update({ status: 'Scanned' })
          .eq('id', ticket.id);

        if (error) {
          console.error('Failed to sync ticket:', ticket.id, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (errorCount === 0) {
        localStorage.removeItem(`offline_event_${eventId}`);
        setSyncResult(`Successfully synced ${successCount} ticket(s) to the cloud. Local data cleared.`);
      } else {
        setSyncResult(`Synced ${successCount} ticket(s), failed ${errorCount}. Please try again.`);
      }
    } catch (err) {
      setSyncResult(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const scannedCount = tickets.filter((t) => t.status === 'Scanned').length;
  const paidCount = tickets.filter((t) => t.status === 'Paid').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="mt-2 text-slate-400">Loading scanner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Scanner Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {showFlash && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            scanResult === 'valid'
              ? 'bg-emerald-500/30'
              : scanResult === 'already_scanned'
              ? 'bg-red-500/30'
              : 'bg-amber-500/30'
          }`}
        />
      )}

      <div
        className={`fixed top-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${
          isOnline
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 text-amber-900'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Online - Scanner Active</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode - Scans Saved Locally</span>
          </>
        )}
      </div>

      <div className="pt-14 pb-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{eventData?.event.name}</h1>
                <p className="text-sm text-slate-400">Ticket Scanner</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Scanned</span>
              </div>
              <p className="text-2xl font-bold text-white">{scannedCount}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-400">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-white">{paidCount}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Enter or scan ticket ID..."
                autoFocus
                autoComplete="off"
                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
            >
              Scan Ticket
            </button>
          </form>

          {lastScanned && (
            <div
              className={`rounded-xl p-6 mb-6 ${
                scanResult === 'valid'
                  ? 'bg-emerald-500/20 border border-emerald-500/50'
                  : scanResult === 'already_scanned'
                  ? 'bg-red-500/20 border border-red-500/50'
                  : 'bg-amber-500/20 border border-amber-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    scanResult === 'valid'
                      ? 'bg-emerald-500'
                      : scanResult === 'already_scanned'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                >
                  {scanResult === 'valid' ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <X className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-lg font-bold ${
                      scanResult === 'valid'
                        ? 'text-emerald-400'
                        : scanResult === 'already_scanned'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {scanResult === 'valid'
                      ? 'Valid Ticket!'
                      : scanResult === 'already_scanned'
                      ? 'Already Scanned!'
                      : 'Not Found'}
                  </p>
                  <p className="text-white font-medium mt-1">{lastScanned.client_name}</p>
                  <p className="text-slate-400 text-sm font-mono">{lastScanned.client_phone}</p>
                  <code className="inline-block mt-2 px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded font-mono">
                    {lastScanned.id.substring(0, 8).toUpperCase()}
                  </code>
                </div>
              </div>
            </div>
          )}

          {scanResult === 'not_found' && !lastScanned && (
            <div className="rounded-xl p-6 mb-6 bg-amber-500/20 border border-amber-500/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-500">
                  <X className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-400">Ticket Not Found</p>
                  <p className="text-slate-400 text-sm">This ticket ID is not in the database</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="font-semibold text-white mb-3">Sync to Cloud</h3>
            <p className="text-sm text-slate-400 mb-4">
              {scannedCount > 0
                ? `You have ${scannedCount} scanned ticket(s) ready to sync.`
                : 'No scanned tickets to sync yet.'}
            </p>

            {syncResult && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm ${
                  syncResult.includes('Successfully')
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {syncResult}
              </div>
            )}

            <button
              onClick={handleSyncToCloud}
              disabled={syncing || !isOnline || scannedCount === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Sync Scans to Cloud
                </>
              )}
            </button>

            {!isOnline && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                Connect to the internet to sync
              </p>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Last exported: {eventData?.exported_at ? new Date(eventData.exported_at).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
