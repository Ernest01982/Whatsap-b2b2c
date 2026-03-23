'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const { merchant } = useAuth();

  const quickActions = [
    {
      title: 'Clients',
      description: 'Manage your customer database',
      href: '/dashboard/clients',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Quotes & Invoices',
      description: 'Create and track documents',
      href: '/dashboard/invoices',
      icon: FileText,
      color: 'bg-emerald-500',
    },
    {
      title: 'Events & Tickets',
      description: 'Manage upcoming events',
      href: '/dashboard/events',
      icon: CalendarDays,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{merchant?.business_name ? `, ${merchant.business_name}` : ''}
          </h1>
          <p className="text-slate-600">Here&apos;s an overview of your business</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">0</p>
          <p className="text-sm text-slate-600">Total Clients</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">R0.00</p>
          <p className="text-sm text-slate-600">Total Invoiced</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-amber-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">0</p>
          <p className="text-sm text-slate-600">Upcoming Events</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">R0.00</p>
          <p className="text-sm text-slate-600">Pending Payments</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
                <p className="text-sm text-slate-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
