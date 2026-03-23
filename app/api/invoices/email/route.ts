import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
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

function getResend(): Resend {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }
  return new Resend(resendApiKey);
}

export async function POST(request: NextRequest) {
  console.log('[Invoice Email] Starting email dispatch...');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Invoice Email] Missing authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Invoice Email] Invalid token:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Invoice Email] Authenticated user:', user.id);

    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    console.log('[Invoice Email] Processing invoice:', invoice_id);

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.error('[Invoice Email] Merchant not found:', merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    console.log('[Invoice Email] Merchant found:', merchant.business_name);

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
      console.error('[Invoice Email] Invoice not found:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const client = invoice.clients as unknown as {
      id: string;
      name: string;
      phone_number: string;
      email_address: string | null;
    };

    if (!client?.email_address) {
      console.error('[Invoice Email] Client email not found');
      return NextResponse.json({ error: 'Client does not have an email address' }, { status: 400 });
    }

    console.log('[Invoice Email] Client email:', client.email_address);

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
      console.error('[Invoice Email] Error fetching invoice items:', itemsError);
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

    console.log('[Invoice Email] Generating PDF...');

    const pdfDocument = React.createElement(InvoiceTemplate, { invoice: invoiceData });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfDocument as any);

    console.log('[Invoice Email] PDF generated, size:', pdfBuffer.length, 'bytes');

    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'invoices@resend.dev';

    console.log('[Invoice Email] Sending email from:', fromEmail, 'to:', client.email_address);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${merchant.business_name} <${fromEmail}>`,
      to: client.email_address,
      subject: `Invoice from ${merchant.business_name} - #${invoice.id.substring(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Hi ${client.name},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Please find attached your invoice from <strong>${merchant.business_name}</strong>.
          </p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Invoice #${invoice.id.substring(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #1e293b;">
              R ${invoice.balance_due.toFixed(2)}
            </p>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Balance Due</p>
          </div>
          <p style="color: #475569; font-size: 14px;">
            If you have any questions about this invoice, please don't hesitate to contact us.
          </p>
          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
            Thank you for your business!<br/>
            <strong>${merchant.business_name}</strong>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoice.id.substring(0, 8).toUpperCase()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (emailError) {
      console.error('[Invoice Email] Resend error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError },
        { status: 500 }
      );
    }

    console.log('[Invoice Email] Email sent successfully:', emailResult?.id);

    return NextResponse.json({
      success: true,
      email_id: emailResult?.id,
      sent_to: client.email_address,
    });
  } catch (error) {
    console.error('[Invoice Email] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
