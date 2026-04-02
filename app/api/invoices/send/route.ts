import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

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
  console.log('[Invoice Send] Starting payment link generation...');

  let body: { invoice_id?: string; payment_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { invoice_id, payment_type } = body;

  if (!invoice_id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Invoice Send] Missing authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Invoice Send] Invalid token:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = checkRateLimit(`invoice-send:${user.id}`, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime) }
      );
    }

    console.log('[Invoice Send] Authenticated user:', user.id);
    console.log('[Invoice Send] Processing invoice:', invoice_id, 'Payment type:', payment_type);

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.error('[Invoice Send] Merchant not found:', merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    console.log('[Invoice Send] Merchant found:', merchant.business_name);

    const { data: invoice, error: invoiceError } = await supabase
      .from('quotes_invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        deposit_amount,
        balance_due,
        status,
        merchant_id
      `)
      .eq('id', invoice_id)
      .eq('merchant_id', merchant.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('[Invoice Send] Invoice not found:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log('[Invoice Send] Invoice found:', invoice.id, 'Status:', invoice.status);

    const isDeposit = payment_type === 'deposit';
    const paymentAmount = isDeposit ? invoice.deposit_amount : invoice.balance_due;

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'No amount due for this payment type' }, { status: 400 });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
    const paymentUrl = `${appBaseUrl}/pay/${invoice.id}?type=${payment_type}`;

    console.log('[Invoice Send] Checkout URL generated:', paymentUrl);

    const newStatus = isDeposit ? 'Pending Deposit' : 'Pending Final';
    const { error: updateError } = await supabase
      .from('quotes_invoices')
      .update({ status: newStatus })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('[Invoice Send] Error updating invoice status:', updateError);
    } else {
      console.log('[Invoice Send] Invoice status updated to:', newStatus);
    }

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      invoice_number: invoice.invoice_number,
      amount: paymentAmount,
      status: newStatus,
    });
  } catch (error) {
    console.error('[Invoice Send] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
