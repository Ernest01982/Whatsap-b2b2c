import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { InvoiceTemplate, InvoiceData } from '@/lib/pdf/invoice-template';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  console.log('[Invoice PDF] Starting PDF generation...');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Invoice PDF] Missing authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Invoice PDF] Invalid token:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Invoice PDF] Authenticated user:', user.id);

    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    console.log('[Invoice PDF] Processing invoice:', invoice_id);

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.error('[Invoice PDF] Merchant not found:', merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: invoice, error: invoiceError } = await supabase
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
          id,
          name,
          phone_number,
          email_address
        )
      `)
      .eq('id', invoice_id)
      .eq('merchant_id', merchant.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('[Invoice PDF] Invoice not found:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const client = invoice.clients as unknown as {
      id: string;
      name: string;
      phone_number: string;
      email_address: string | null;
    };

    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        id,
        quantity,
        line_total,
        services (
          name,
          price
        )
      `)
      .eq('invoice_id', invoice_id);

    if (itemsError) {
      console.error('[Invoice PDF] Error fetching invoice items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch invoice items' }, { status: 500 });
    }

    const items = (invoiceItems || []).map((item) => {
      const service = item.services as unknown as { name: string; price: number } | null;
      return {
        id: item.id,
        service_name: service?.name || 'Service',
        quantity: item.quantity,
        unit_price: service?.price || 0,
        line_total: item.line_total,
      };
    });

    const invoiceData: InvoiceData = {
      id: invoice.id,
      created_at: invoice.created_at,
      status: invoice.status,
      total_amount: invoice.total_amount,
      deposit_amount: invoice.deposit_amount,
      amount_paid: invoice.amount_paid,
      balance_due: invoice.balance_due,
      merchant: {
        business_name: merchant.business_name,
      },
      client: {
        name: client.name,
        phone_number: client.phone_number,
        email_address: client.email_address,
      },
      items,
    };

    console.log('[Invoice PDF] Generating PDF...');

    const pdfDocument = React.createElement(InvoiceTemplate, { invoice: invoiceData });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfDocument as any);

    console.log('[Invoice PDF] PDF generated, size:', pdfBuffer.length, 'bytes');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.id.substring(0, 8).toUpperCase()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Invoice PDF] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
