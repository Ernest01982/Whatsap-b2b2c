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

interface OzowPaymentRequest {
  SiteCode: string;
  CountryCode: string;
  CurrencyCode: string;
  Amount: string;
  TransactionReference: string;
  BankReference: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  Customer?: string;
  CancelUrl: string;
  ErrorUrl: string;
  SuccessUrl: string;
  NotifyUrl: string;
  IsTest: boolean;
  HashCheck: string;
}

function generateOzowHash(payload: Omit<OzowPaymentRequest, 'HashCheck'>, privateKey: string): string {
  const hashString = [
    payload.SiteCode,
    payload.CountryCode,
    payload.CurrencyCode,
    payload.Amount,
    payload.TransactionReference,
    payload.BankReference,
    payload.Optional1 || '',
    payload.Optional2 || '',
    payload.Optional3 || '',
    payload.Optional4 || '',
    payload.Optional5 || '',
    payload.Customer || '',
    payload.CancelUrl,
    payload.ErrorUrl,
    payload.SuccessUrl,
    payload.NotifyUrl,
    payload.IsTest.toString(),
    privateKey,
  ].join('');

  return crypto.createHash('sha512').update(hashString.toLowerCase()).digest('hex');
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  templateName: string,
  parameters: string[],
  whatsappToken: string,
  whatsappPhoneId: string
): Promise<boolean> {
  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = formattedPhone.startsWith('27') ? formattedPhone : `27${formattedPhone.replace(/^0/, '')}`;

    console.log('[WhatsApp] Sending message to:', fullPhone);

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
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: parameters.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      }),
    });

    const data = await response.json();
    console.log('[WhatsApp] Response:', JSON.stringify(data, null, 2));

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[Invoice Send] Starting payment generation...');

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

    const body = await request.json();
    const { invoice_id, payment_type } = body;

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    console.log('[Invoice Send] Processing invoice:', invoice_id, 'Payment type:', payment_type);

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name, ozow_site_code, ozow_private_key, ozow_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.error('[Invoice Send] Merchant not found:', merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    console.log('[Invoice Send] Merchant found:', merchant.business_name);

    if (!merchant.ozow_site_code || !merchant.ozow_private_key || !merchant.ozow_api_key) {
      console.error('[Invoice Send] Missing Ozow credentials');
      return NextResponse.json(
        { error: 'Ozow payment credentials not configured. Please update your settings.' },
        { status: 400 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('quotes_invoices')
      .select(`
        id,
        total_amount,
        deposit_amount,
        balance_due,
        status,
        merchant_id,
        clients (
          id,
          name,
          phone_number
        )
      `)
      .eq('id', invoice_id)
      .eq('merchant_id', merchant.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('[Invoice Send] Invoice not found:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log('[Invoice Send] Invoice found:', invoice.id, 'Status:', invoice.status);

    const client = invoice.clients as unknown as { id: string; name: string; phone_number: string };
    if (!client) {
      console.error('[Invoice Send] Client not found for invoice');
      return NextResponse.json({ error: 'Client not found for invoice' }, { status: 404 });
    }

    const isDeposit = payment_type === 'deposit';
    const paymentAmount = isDeposit ? invoice.deposit_amount : invoice.balance_due;

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'No amount due for this payment type' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const transactionRef = `INV-${invoice.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

    const ozowPayload: Omit<OzowPaymentRequest, 'HashCheck'> = {
      SiteCode: merchant.ozow_site_code,
      CountryCode: 'ZA',
      CurrencyCode: 'ZAR',
      Amount: paymentAmount.toFixed(2),
      TransactionReference: transactionRef,
      BankReference: `INV-${invoice.id.substring(0, 8).toUpperCase()}`,
      Optional1: invoice.id,
      Optional2: isDeposit ? 'deposit' : 'final',
      Customer: client.phone_number,
      CancelUrl: `${baseUrl}/payment/cancelled`,
      ErrorUrl: `${baseUrl}/payment/error`,
      SuccessUrl: `${baseUrl}/payment/success`,
      NotifyUrl: `${baseUrl}/api/webhooks/ozow`,
      IsTest: process.env.NODE_ENV !== 'production',
    };

    const hashCheck = generateOzowHash(ozowPayload, merchant.ozow_private_key);
    const fullPayload: OzowPaymentRequest = { ...ozowPayload, HashCheck: hashCheck };

    console.log('[Invoice Send] Generating Ozow payment link...');
    console.log('[Invoice Send] Payload (without hash):', JSON.stringify(ozowPayload, null, 2));

    const ozowResponse = await fetch('https://api.ozow.com/PostPaymentRequest', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'ApiKey': merchant.ozow_api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullPayload),
    });

    const ozowData = await ozowResponse.json();
    console.log('[Invoice Send] Ozow response:', JSON.stringify(ozowData, null, 2));

    if (!ozowResponse.ok || !ozowData.url) {
      console.error('[Invoice Send] Ozow API error:', ozowData);
      return NextResponse.json(
        { error: 'Failed to generate payment link', details: ozowData },
        { status: 500 }
      );
    }

    const paymentUrl = ozowData.url;
    console.log('[Invoice Send] Payment URL generated:', paymentUrl);

    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    let whatsappSent = false;
    if (whatsappToken && whatsappPhoneId) {
      console.log('[Invoice Send] Sending WhatsApp message...');

      whatsappSent = await sendWhatsAppMessage(
        client.phone_number,
        'invoice_payment_request',
        [
          client.name,
          merchant.business_name,
          `R${paymentAmount.toFixed(2)}`,
          paymentUrl,
        ],
        whatsappToken,
        whatsappPhoneId
      );

      console.log('[Invoice Send] WhatsApp sent:', whatsappSent);
    } else {
      console.log('[Invoice Send] WhatsApp credentials not configured, skipping message');
    }

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
      transaction_reference: transactionRef,
      whatsapp_sent: whatsappSent,
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
