'use client';

import { useOfflineSync } from '@/contexts/offline-sync-context';
import { WifiOff, Cloud, Loader as Loader2 } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline, pendingInvoices, isSyncing, syncError } = useOfflineSync();

  if (isOnline && pendingInvoices.length === 0 && !syncError) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div className="bg-amber-500 text-amber-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Changes will sync when connection returns.</span>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingInvoices.length} pending invoice(s)...</span>
        </div>
      )}

      {isOnline && !isSyncing && pendingInvoices.length > 0 && (
        <div className="bg-emerald-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <Cloud className="w-4 h-4" />
          <span>{pendingInvoices.length} invoice(s) queued for sync</span>
        </div>
      )}

      {syncError && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <span>{syncError}</span>
        </div>
      )}
    </div>
  );
}
