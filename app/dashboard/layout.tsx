'use client';

import { useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen bg-slate-50">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="lg:pl-64">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
