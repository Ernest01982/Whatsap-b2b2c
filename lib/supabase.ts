import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          feature_invoicing: boolean;
          feature_ticketing: boolean;
          ozow_site_code: string | null;
          ozow_private_key: string | null;
          ozow_api_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          feature_invoicing?: boolean;
          feature_ticketing?: boolean;
          ozow_site_code?: string | null;
          ozow_private_key?: string | null;
          ozow_api_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          feature_invoicing?: boolean;
          feature_ticketing?: boolean;
          ozow_site_code?: string | null;
          ozow_private_key?: string | null;
          ozow_api_key?: string | null;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          merchant_id: string;
          phone_number: string;
          name: string;
          email_address: string | null;
          region: string | null;
          is_subscribed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          phone_number: string;
          name: string;
          email_address?: string | null;
          region?: string | null;
          is_subscribed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          phone_number?: string;
          name?: string;
          email_address?: string | null;
          region?: string | null;
          is_subscribed?: boolean;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          price: number;
          pricing_type: 'Fixed' | 'Per Hour' | 'Per Sqm';
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          price: number;
          pricing_type: 'Fixed' | 'Per Hour' | 'Per Sqm';
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          price?: number;
          pricing_type?: 'Fixed' | 'Per Hour' | 'Per Sqm';
          created_at?: string;
        };
      };
      quotes_invoices: {
        Row: {
          id: string;
          merchant_id: string;
          client_id: string;
          status: 'Draft' | 'Pending Deposit' | 'Pending Final' | 'Paid' | 'Cancelled';
          total_amount: number;
          deposit_amount: number;
          amount_paid: number;
          balance_due: number;
          ozow_transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          client_id: string;
          status?: 'Draft' | 'Pending Deposit' | 'Pending Final' | 'Paid' | 'Cancelled';
          total_amount?: number;
          deposit_amount?: number;
          amount_paid?: number;
          balance_due?: number;
          ozow_transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          client_id?: string;
          status?: 'Draft' | 'Pending Deposit' | 'Pending Final' | 'Paid' | 'Cancelled';
          total_amount?: number;
          deposit_amount?: number;
          amount_paid?: number;
          balance_due?: number;
          ozow_transaction_id?: string | null;
          created_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          service_id: string | null;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          service_id?: string | null;
          quantity: number;
          line_total: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          service_id?: string | null;
          quantity?: number;
          line_total?: number;
        };
      };
      events: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          event_date: string;
          capacity: number;
          ticket_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          event_date: string;
          capacity: number;
          ticket_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          event_date?: string;
          capacity?: number;
          ticket_price?: number;
          created_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          client_id: string;
          status: 'Reserved' | 'Paid' | 'Scanned';
          qr_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          client_id: string;
          status?: 'Reserved' | 'Paid' | 'Scanned';
          qr_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          client_id?: string;
          status?: 'Reserved' | 'Paid' | 'Scanned';
          qr_hash?: string;
          created_at?: string;
        };
      };
    };
  };
};
