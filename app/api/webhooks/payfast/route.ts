import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}

const PAYFAST_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
];

async function verifyPayfastSignature(
  data: Record<string, string>,
  signature: string,
  passphrase?: string
): Promise<boolean> {
  const sortedKeys = [
    'm_payment_id', 'pf_payment_id', 'payment_status', 'item_name', 'item_description',
    'amount_gross', 'amount_fee', 'amount_net', 'custom_str1', 'custom_str2',
    'custom_str3', 'custom_str4', 'custom_str5', 'custom_int1', 'custom_int2',
    'custom_int3', 'custom_int4', 'custom_int5', 'name_first', 'name_last',
    'email_address', 'merchant_id'
  ];

  const params: string[] = [];
  for (const key of sortedKeys) {
    if (data[key] !== undefined && data[key] !== '') {
      params.push(`${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`);
    }
  }

  if (passphrase) {
    params.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`);
  }

  const paramString = params.join('&');

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(paramString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return calculatedSignature === signature;
}

async function verifyPayfastServer(pfHost: string): Promise<boolean> {
  return PAYFAST_HOSTS.includes(pfHost);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    console.log('PayFast ITN received:', {
      m_payment_id: data.m_payment_id,
      pf_payment_id: data.pf_payment_id,
      payment_status: data.payment_status,
      amount_gross: data.amount_gross,
    });

    const pfHost = request.headers.get('host') || '';
    const referer = request.headers.get('referer') || '';

    let isValidHost = false;
    for (const host of PAYFAST_HOSTS) {
      if (referer.includes(host) || pfHost.includes(host)) {
        isValidHost = true;
        break;
      }
    }

    const invoiceId = data.m_payment_id;
    if (!invoiceId) {
      console.error('No invoice ID in ITN');
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }

    const { data: invoice, error: invoiceError } = await getSupabaseAdmin()
      .from('quotes_invoices')
      .select(`
        *,
        merchants (
          payfast_merchant_id,
          payfast_passphrase,
          payfast_sandbox_mode
        )
      `)
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const merchant = invoice.merchants;
    if (!merchant) {
      console.error('Merchant not found for invoice:', invoiceId);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (data.merchant_id !== merchant.payfast_merchant_id) {
      console.error('Merchant ID mismatch:', data.merchant_id, merchant.payfast_merchant_id);
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 400 });
    }

    const paymentStatus = data.payment_status;
    const amountGross = parseFloat(data.amount_gross || '0');

    if (paymentStatus === 'COMPLETE') {
      const newAmountPaid = (invoice.amount_paid || 0) + amountGross;
      const newBalanceDue = Math.max(0, invoice.total_amount - newAmountPaid);
      const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Pending Final';

      const { error: updateError } = await getSupabaseAdmin()
        .from('quotes_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
      }

      console.log('Invoice updated successfully:', {
        invoiceId,
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      });
    } else if (paymentStatus === 'CANCELLED') {
      console.log('Payment cancelled for invoice:', invoiceId);
    } else {
      console.log('Payment status:', paymentStatus, 'for invoice:', invoiceId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PayFast webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'PayFast webhook endpoint' });
}
