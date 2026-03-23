'use client';

import { Database, CircleCheck as CheckCircle, FileText, Ticket } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">System Foundation</h1>
                <p className="text-slate-400 text-sm">Multi-Tenant B2B2C Platform</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span className="text-lg font-medium text-slate-800">Initialized: Ready for UI</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-slate-800">Invoicing Module</h3>
                  <p className="text-sm text-slate-600">Merchants, clients, services, quotes, and invoice management</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Ticket className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-slate-800">Ticketing Module</h3>
                  <p className="text-sm text-slate-600">Events and tickets with QR verification support</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Database Tables Created</h4>
              <div className="flex flex-wrap gap-2">
                {['merchants', 'clients', 'services', 'quotes_invoices', 'invoice_items', 'events', 'tickets'].map((table) => (
                  <span
                    key={table}
                    className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full font-mono"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Supabase connected with Row Level Security enabled
        </p>
      </div>
    </div>
  );
}
