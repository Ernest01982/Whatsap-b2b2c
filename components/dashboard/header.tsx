'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Menu, LogOut, Loader as Loader2, Building2 } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { merchant } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-600" />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium text-slate-900">
              {merchant?.business_name || 'Loading...'}
            </p>
            <p className="text-xs text-slate-500">Merchant Dashboard</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
      >
        {signingOut ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Signing out...</span>
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </>
        )}
      </button>
    </header>
  );
}
