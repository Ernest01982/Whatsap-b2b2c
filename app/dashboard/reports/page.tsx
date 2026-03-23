'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { BarChart3, Download, Loader2, CircleAlert as AlertCircle, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

type ExportType = 'all' | 'invoices' | 'tickets';

export default function ReportsPage() {
  const { merchant } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportType, setExportType] = useState<ExportType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleExport = async () => {
    if (!merchant) {
      setError('Please log in to export reports');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const workbook = XLSX.utils.book_new();
      const startDateTime = new Date(startDate).toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();

      if (exportType === 'all' || exportType === 'invoices') {
        const { data: invoices, error: invoiceError } = await supabase
          .from('quotes_invoices')
          .select(`
            id,
            status,
            total_amount,
            deposit_amount,
            amount_paid,
            balance_due,
            created_at,
            clients (
              name,
              phone_number,
              email_address
            )
          `)
          .eq('merchant_id', merchant.id)
          .gte('created_at', startDateTime)
          .lte('created_at', endDateTime)
          .order('created_at', { ascending: false });

        if (invoiceError) throw invoiceError;

        const invoiceData = (invoices || []).map((inv) => {
          const client = inv.clients as unknown as { name: string; phone_number: string; email_address: string | null } | null;
          return {
            'Invoice ID': inv.id.substring(0, 8).toUpperCase(),
            'Date': formatDate(inv.created_at),
            'Client Name': client?.name || 'N/A',
            'Client Phone': client?.phone_number || 'N/A',
            'Client Email': client?.email_address || 'N/A',
            'Status': inv.status,
            'Total Amount': formatCurrency(inv.total_amount),
            'Deposit Amount': formatCurrency(inv.deposit_amount),
            'Amount Paid': formatCurrency(inv.amount_paid),
            'Balance Due': formatCurrency(inv.balance_due),
          };
        });

        const invoiceSheet = XLSX.utils.json_to_sheet(invoiceData.length > 0 ? invoiceData : [{ 'Message': 'No invoices found for this period' }]);
        XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoices');
      }

      if (exportType === 'all' || exportType === 'tickets') {
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('merchant_id', merchant.id);

        const eventIds = (events || []).map((e: { id: string }) => e.id);

        if (eventIds.length > 0) {
          const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .select(`
              id,
              status,
              created_at,
              events (
                name,
                event_date,
                ticket_price
              ),
              clients (
                name,
                phone_number,
                email_address
              )
            `)
            .in('event_id', eventIds)
            .gte('created_at', startDateTime)
            .lte('created_at', endDateTime)
            .order('created_at', { ascending: false });

          if (ticketError) throw ticketError;

          const ticketData = (tickets || []).map((ticket) => {
            const event = ticket.events as unknown as { name: string; event_date: string; ticket_price: number } | null;
            const client = ticket.clients as unknown as { name: string; phone_number: string; email_address: string | null } | null;
            return {
              'Ticket ID': ticket.id.substring(0, 8).toUpperCase(),
              'Purchase Date': formatDate(ticket.created_at),
              'Event Name': event?.name || 'N/A',
              'Event Date': event?.event_date ? formatDate(event.event_date) : 'N/A',
              'Ticket Price': event?.ticket_price ? formatCurrency(event.ticket_price) : 'N/A',
              'Client Name': client?.name || 'N/A',
              'Client Phone': client?.phone_number || 'N/A',
              'Status': ticket.status,
            };
          });

          const ticketSheet = XLSX.utils.json_to_sheet(ticketData.length > 0 ? ticketData : [{ 'Message': 'No tickets found for this period' }]);
          XLSX.utils.book_append_sheet(workbook, ticketSheet, 'Tickets');
        } else if (exportType === 'tickets') {
          const ticketSheet = XLSX.utils.json_to_sheet([{ 'Message': 'No events found' }]);
          XLSX.utils.book_append_sheet(workbook, ticketSheet, 'Tickets');
        }
      }

      const fileName = `${merchant.business_name.replace(/\s+/g, '_')}_Report_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-600">Export transaction data for accounting and analysis</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Generate Excel Report</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Export Type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportType)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="all">All Transactions</option>
              <option value="invoices">Only Invoices</option>
              <option value="tickets">Only Tickets</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={loading || !startDate || !endDate}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Excel Report
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Report Contents</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            {(exportType === 'all' || exportType === 'invoices') && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Invoices: ID, Date, Client Details, Status, Amounts (Total, Deposit, Paid, Balance)
              </li>
            )}
            {(exportType === 'all' || exportType === 'tickets') && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Tickets: ID, Purchase Date, Event Details, Client Info, Payment Status
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Export Options</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setStartDate(firstDay.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
              setExportType('all');
            }}
            className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
          >
            <p className="font-medium text-slate-900">This Month</p>
            <p className="text-sm text-slate-600">All transactions from the current month</p>
          </button>

          <button
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
              setStartDate(lastMonth.toISOString().split('T')[0]);
              setEndDate(lastMonthEnd.toISOString().split('T')[0]);
              setExportType('all');
            }}
            className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
          >
            <p className="font-medium text-slate-900">Last Month</p>
            <p className="text-sm text-slate-600">All transactions from the previous month</p>
          </button>

          <button
            onClick={() => {
              const today = new Date();
              const yearStart = new Date(today.getFullYear(), 0, 1);
              setStartDate(yearStart.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
              setExportType('all');
            }}
            className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
          >
            <p className="font-medium text-slate-900">Year to Date</p>
            <p className="text-sm text-slate-600">All transactions since January 1st</p>
          </button>
        </div>
      </div>
    </div>
  );
}
