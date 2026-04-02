import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Invoice Send] Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // THE FIX: Bulletproof Supabase Client for Next.js App Router
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        // Bypasses Next.js fetch caching bugs
        fetch: (url, options) => fetch(url, options),
      },
    });

    // Explicitly pass the token to getUser
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

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('quotes_invoices')
      .select('id, invoice_number, total_amount, deposit_amount, balance_due, status, merchant_id')
      .eq('id', invoice_id)
      .eq('merchant_id', merchant.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isDeposit = payment_type === 'deposit';
    const paymentAmount = isDeposit ? invoice.deposit_amount : invoice.balance_due;

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'No amount due for this payment type' }, { status: 400 });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
    const paymentUrl = `${appBaseUrl}/pay/${invoice.id}?type=${payment_type}`;

    const newStatus = isDeposit ? 'Pending Deposit' : 'Pending Final';
    await supabase.from('quotes_invoices').update({ status: newStatus }).eq('id', invoice.id);

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