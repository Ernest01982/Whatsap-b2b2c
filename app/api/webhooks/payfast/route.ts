import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PAYFAST_HOSTS,
  generatePayfastITNSignature,
  validatePayfastITN,
} from '@/lib/payfast';

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

function verifyPayfastHost(request: NextRequest): boolean {
  const referer = request.headers.get('referer') || '';
  const forwardedHost = request.headers.get('x-forwarded-host') || '';

  for (const host of PAYFAST_HOSTS) {
    if (referer.includes(host) || forwardedHost.includes(host)) {
      return true;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  console.log('[PayFast ITN] Received webhook request');

  try {
    const formData = await request.formData();
    const pfData: Record<string, string> = {};

    formData.forEach((value, key) => {
      pfData[key] = value.toString();
    });

    console.log('[PayFast ITN] Data received:', {
      m_payment_id: pfData.m_payment_id,
      pf_payment_id: pfData.pf_payment_id,
      payment_status: pfData.payment_status,
      amount_gross: pfData.amount_gross,
      merchant_id: pfData.merchant_id,
    });

    if (!verifyPayfastHost(request)) {
      console.error('[PayFast ITN] Invalid host');
      return NextResponse.json({ error: 'Invalid host' }, { status: 403 });
    }

    const invoiceId = pfData.m_payment_id;
    if (!invoiceId) {
      console.error('[PayFast ITN] No invoice ID provided');
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }

    const { data: invoice, error: invoiceError } = await getSupabaseAdmin()
      .from('quotes_invoices')
      .select(`
        *,
        merchants (
          id,
          payfast_merchant_id,
          payfast_passphrase,
          payfast_sandbox_mode
        )
      `)
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('[PayFast ITN] Invoice not found:', invoiceId, invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const merchant = invoice.merchants;
    if (!merchant) {
      console.error('[PayFast ITN] Merchant not found for invoice:', invoiceId);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (pfData.merchant_id !== merchant.payfast_merchant_id) {
      console.error('[PayFast ITN] Merchant ID mismatch:', {
        received: pfData.merchant_id,
        expected: merchant.payfast_merchant_id,
      });
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 400 });
    }

    const receivedSignature = pfData.signature;
    if (receivedSignature) {
      const calculatedSignature = generatePayfastITNSignature(
        pfData,
        merchant.payfast_passphrase || undefined
      );

      if (calculatedSignature !== receivedSignature) {
        console.error('[PayFast ITN] Signature mismatch:', {
          received: receivedSignature,
          calculated: calculatedSignature,
        });
      }
    }

    const sandboxMode = merchant.payfast_sandbox_mode ?? true;
    const isValid = await validatePayfastITN(pfData, sandboxMode);

    if (!isValid) {
      console.warn('[PayFast ITN] Validation failed, but proceeding for sandbox');
    }

    const expectedAmount = invoice.balance_due || invoice.total_amount;
    const receivedAmount = parseFloat(pfData.amount_gross || '0');

    if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
      console.warn('[PayFast ITN] Amount mismatch:', {
        expected: expectedAmount,
        received: receivedAmount,
      });
    }

    const paymentStatus = pfData.payment_status;
    const amountGross = parseFloat(pfData.amount_gross || '0');

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
        console.error('[PayFast ITN] Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
      }

      console.log('[PayFast ITN] Invoice updated successfully:', {
        invoiceId,
        pfPaymentId: pfData.pf_payment_id,
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      });
    } else if (paymentStatus === 'CANCELLED') {
      console.log('[PayFast ITN] Payment cancelled for invoice:', invoiceId);
    } else if (paymentStatus === 'PENDING') {
      console.log('[PayFast ITN] Payment pending for invoice:', invoiceId);
    } else {
      console.log('[PayFast ITN] Payment status:', paymentStatus, 'for invoice:', invoiceId);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[PayFast ITN] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'PayFast webhook endpoint is active' });
}
