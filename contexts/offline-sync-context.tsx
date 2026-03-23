'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface OfflineInvoice {
  id: string;
  client_id: string;
  items: Array<{
    service_id: string;
    quantity: number;
    line_total: number;
  }>;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
}

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingInvoices: OfflineInvoice[];
  addOfflineInvoice: (invoice: OfflineInvoice) => void;
  syncPendingInvoices: () => Promise<void>;
  isSyncing: boolean;
  syncError: string | null;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

const OFFLINE_INVOICE_KEY = 'offline_invoice_queue';

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingInvoices, setPendingInvoices] = useState<OfflineInvoice[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const stored = localStorage.getItem(OFFLINE_INVOICE_KEY);
    if (stored) {
      try {
        setPendingInvoices(JSON.parse(stored));
      } catch {
        console.error('[OfflineSync] Failed to parse stored invoices');
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addOfflineInvoice = useCallback((invoice: OfflineInvoice) => {
    setPendingInvoices((prev) => {
      const updated = [...prev, invoice];
      localStorage.setItem(OFFLINE_INVOICE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const syncPendingInvoices = useCallback(async () => {
    if (!isOnline || pendingInvoices.length === 0 || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    const successfulIds: string[] = [];

    for (const invoice of pendingInvoices) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error('Not authenticated');
        }

        const { data: merchant } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', session.session.user.id)
          .maybeSingle();

        if (!merchant) {
          throw new Error('Merchant not found');
        }

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('quotes_invoices')
          .insert({
            merchant_id: merchant.id,
            client_id: invoice.client_id,
            status: 'Pending Deposit',
            total_amount: invoice.total_amount,
            deposit_amount: invoice.deposit_amount,
            amount_paid: 0,
            balance_due: invoice.total_amount,
          })
          .select('id')
          .single();

        if (invoiceError || !newInvoice) {
          throw new Error(invoiceError?.message || 'Failed to create invoice');
        }

        const itemsToInsert = invoice.items.map((item) => ({
          invoice_id: newInvoice.id,
          service_id: item.service_id,
          quantity: item.quantity,
          line_total: item.line_total,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) {
          throw new Error(itemsError.message);
        }

        try {
          await fetch('/api/invoices/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ invoice_id: newInvoice.id }),
          });
        } catch {
          console.log('[OfflineSync] WhatsApp send failed, invoice still created');
        }

        successfulIds.push(invoice.id);
        console.log('[OfflineSync] Synced invoice:', invoice.id);
      } catch (error) {
        console.error('[OfflineSync] Failed to sync invoice:', invoice.id, error);
        setSyncError(`Failed to sync some invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setPendingInvoices((prev) => {
      const remaining = prev.filter((inv) => !successfulIds.includes(inv.id));
      localStorage.setItem(OFFLINE_INVOICE_KEY, JSON.stringify(remaining));
      return remaining;
    });

    setIsSyncing(false);
  }, [isOnline, pendingInvoices, isSyncing]);

  useEffect(() => {
    if (isOnline && pendingInvoices.length > 0) {
      const timer = setTimeout(() => {
        syncPendingInvoices();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingInvoices.length, syncPendingInvoices]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        pendingInvoices,
        addOfflineInvoice,
        syncPendingInvoices,
        isSyncing,
        syncError,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
}
