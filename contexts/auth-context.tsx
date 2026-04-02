'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  feature_invoicing: boolean;
  feature_ticketing: boolean;
  ozow_site_code: string | null;
  ozow_private_key: string | null;
  ozow_api_key: string | null;
  payfast_merchant_id: string | null;
  payfast_merchant_key: string | null;
  payfast_passphrase: string | null;
  payfast_sandbox_mode: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  merchant: Merchant | null;
  loading: boolean;
  refreshMerchant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  merchant: null,
  loading: true,
  refreshMerchant: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMerchant = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setMerchant(data);
  }, []);

  const refreshMerchant = useCallback(async () => {
    if (user) {
      await fetchMerchant(user.id);
    }
  }, [user, fetchMerchant]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMerchant(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchMerchant(session.user.id);
        })();
      } else {
        setMerchant(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchMerchant]);

  return (
    <AuthContext.Provider value={{ user, session, merchant, loading, refreshMerchant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
