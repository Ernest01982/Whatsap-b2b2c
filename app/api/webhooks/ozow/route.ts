import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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

interface OzowWebhookPayload {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  CurrencyCode: string;
  IsTest: string;
  StatusMessage?: string;
  Hash: string;
}

function verifyOzowHash(payload: OzowWebhookPayload, privateKey: string): boolean {
  const hashString = [
    payload.SiteCode,
    payload.TransactionId,
    payload.TransactionReference,
    payload.Amount,
    payload.Status,
    payload.Optional1 || '',
    payload.Optional2 || '',
    payload.Optional3 || '',
    payload.Optional4 || '',
    payload.Optional5 || '',
    payload.CurrencyCode,
    payload.IsTest,
    payload.StatusMessage || '',
    privateKey,
  ].join('');

  const calculatedHash = crypto.createHash('sha512').update(hashString.toLowerCase()).digest('hex');

  console.log('[Ozow Webhook] Hash verification:');
  console.log('[Ozow Webhook] Expected hash:', payload.Hash?.toLowerCase());
  console.log('[Ozow Webhook] Calculated hash:', calculatedHash);

  return calculatedHash === payload.Hash?.toLowerCase();
}

async function sendWhatsAppReceipt(
  phoneNumber: string,
  businessName: string,
  amount: string,
  referenceNumber: string,
  whatsappToken: string,
  whatsappPhoneId: string
): Promise<boolean> {
  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = formattedPhone.startsWith('27') ? formattedPhone : `27${formattedPhone.replace(/^0/, '')}`;

    console.log('[WhatsApp Receipt] Sending to:', fullPhone);

    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: fullPhone,
        type: 'template',
        template: {
          name: 'payment_receipt',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: businessName },
                { type: 'text', text: amount },
                { type: 'text', text: referenceNumber },
              ],
            },
          ],
        },
      }),
    });

    const data = await response.json();
    console.log('[WhatsApp Receipt] Response:', JSON.stringify(data, null, 2));

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp Receipt] Error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[Ozow Webhook] Received webhook request');

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = checkRateLimit(`webhook-ozow:${ip}`, { maxRequests: 100, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    console.warn('[Ozow Webhook] Rate limit exceeded for IP:', ip);
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime) }
    );
  }

  try {
    let payload: OzowWebhookPayload;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as unknown as OzowWebhookPayload;
    } else {
      payload = await request.json();
    }

    console.log('[Ozow Webhook] Payload received:', JSON.stringify(payload, null, 2));

    const { SiteCode, TransactionId, TransactionReference, Amount, Status, Optional1, Optional2, Hash } = payload;

    if (!SiteCode || !TransactionId || !Status || !Hash) {
      console.error('[Ozow Webhook] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const invoiceId = Optional1;
    const paymentType = Optional2;
    const isTicketPayment = Optional2 === 'ticket';

    console.log('[Ozow Webhook] Processing payment:');
    console.log('[Ozow Webhook] - Invoice/Ticket ID:', invoiceId);
    console.log('[Ozow Webhook] - Payment Type:', paymentType);
    console.log('[Ozow Webhook] - Status:', Status);
    console.log('[Ozow Webhook] - Amount:', Amount);

    const supabase = getSupabaseAdmin();
    let merchantPrivateKey: string | null = null;
    let merchantBusinessName: string = '';
    let clientPhoneNumber: string = '';

    if (isTicketPayment && invoiceId) {
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          event_id,
          events (
            id,
            merchant_id,
            merchants (
              id,
              business_name,
              ozow_private_key
            )
          ),
          clients (
            phone_number,
            name
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (ticketError || !ticket) {
        console.error('[Ozow Webhook] Ticket not found:', ticketError);
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const event = ticket.events as unknown as {
        id: string;
        merchant_id: string;
        merchants: { id: string; business_name: string; ozow_private_key: string | null }
      };
      const client = ticket.clients as unknown as { phone_number: string; name: string };

      merchantPrivateKey = event?.merchants?.ozow_private_key || null;
      merchantBusinessName = event?.merchants?.business_name || '';
      clientPhoneNumber = client?.phone_number || '';
    } else if (invoiceId) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('quotes_invoices')
        .select(`
          id,
          merchant_id,
          total_amount,
          deposit_amount,
          amount_paid,
          balance_due,
          merchants (
            id,
            business_name,
            ozow_private_key
          ),
          clients (
            phone_number,
            name
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError || !invoice) {
        console.error('[Ozow Webhook] Invoice not found:', invoiceError);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const merchant = invoice.merchants as unknown as { id: string; business_name: string; ozow_private_key: string | null };
      const client = invoice.clients as unknown as { phone_number: string; name: string };

      merchantPrivateKey = merchant?.ozow_private_key || null;
      merchantBusinessName = merchant?.business_name || '';
      clientPhoneNumber = client?.phone_number || '';
    }

    if (!merchantPrivateKey) {
      console.error('[Ozow Webhook] Merchant private key not found');
      return NextResponse.json({ error: 'Merchant configuration error' }, { status: 500 });
    }

    const isValidHash = verifyOzowHash(payload, merchantPrivateKey);
    if (!isValidHash) {
      console.error('[Ozow Webhook] Hash verification FAILED - possible tampering');
      return NextResponse.json({ error: 'Hash verification failed' }, { status: 403 });
    }

    console.log('[Ozow Webhook] Hash verification PASSED');

    if (Status !== 'Complete') {
      console.log('[Ozow Webhook] Payment not complete, status:', Status);
      return NextResponse.json({
        received: true,
        message: `Payment status: ${Status}`,
        processed: false
      });
    }

    const paymentAmount = parseFloat(Amount);
    console.log('[Ozow Webhook] Processing completed payment of R', paymentAmount);

    if (isTicketPayment && invoiceId) {
      console.log('[Ozow Webhook] Updating ticket status to Paid');

      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: 'Paid' })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('[Ozow Webhook] Error updating ticket:', updateError);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
      }

      console.log('[Ozow Webhook] Ticket status updated successfully');
    } else if (invoiceId) {
      const { data: invoice, error: fetchError } = await supabase
        .from('quotes_invoices')
        .select('id, total_amount, deposit_amount, amount_paid, balance_due')
        .eq('id', invoiceId)
        .maybeSingle();

      if (fetchError || !invoice) {
        console.error('[Ozow Webhook] Error fetching invoice for update:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
      }

      const newAmountPaid = invoice.amount_paid + paymentAmount;
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Pending Final';

      console.log('[Ozow Webhook] Updating invoice:');
      console.log('[Ozow Webhook] - Previous amount paid:', invoice.amount_paid);
      console.log('[Ozow Webhook] - Payment amount:', paymentAmount);
      console.log('[Ozow Webhook] - New amount paid:', newAmountPaid);
      console.log('[Ozow Webhook] - New balance due:', newBalanceDue);
      console.log('[Ozow Webhook] - New status:', newStatus);

      const { error: updateError } = await supabase
        .from('quotes_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
          ozow_transaction_id: TransactionId,
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('[Ozow Webhook] Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
      }

      console.log('[Ozow Webhook] Invoice updated successfully');
    }

    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (whatsappToken && whatsappPhoneId && clientPhoneNumber) {
      console.log('[Ozow Webhook] Sending payment receipt via WhatsApp...');

      await sendWhatsAppReceipt(
        clientPhoneNumber,
        merchantBusinessName,
        `R${paymentAmount.toFixed(2)}`,
        TransactionReference,
        whatsappToken,
        whatsappPhoneId
      );
    }

    console.log('[Ozow Webhook] Webhook processing complete');
    return NextResponse.json({
      received: true,
      processed: true,
      transaction_id: TransactionId,
      status: Status
    });
  } catch (error) {
    console.error('[Ozow Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Ozow webhook endpoint active' });
}
