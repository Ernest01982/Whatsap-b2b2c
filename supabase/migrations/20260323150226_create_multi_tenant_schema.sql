/*
  # Multi-Tenant B2B2C SaaS Platform Schema

  ## Overview
  This schema supports a multi-tenant platform for South African service contractors
  and event organizers to manage quoting, invoicing, and ticketing with Ozow payments.

  ## Tables
  1. merchants - Business accounts linked to Supabase Auth users
  2. clients - Customer records scoped to each merchant
  3. services - Service catalog with flexible pricing models
  4. quotes_invoices - Unified quote/invoice documents with payment tracking
  5. invoice_items - Line items linking invoices to services
  6. events - Event management for ticketing merchants
  7. tickets - Individual ticket records with QR verification

  ## Security
  - RLS enabled on ALL tables
  - All policies enforce merchant_id ownership check via auth.uid()
  - Merchants can only access their own data

  ## Notes
  - All monetary values stored as DECIMAL(12,2) for ZAR currency precision
  - Timestamps use timestamptz for timezone awareness
  - UUIDs used for all primary keys
*/

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('Fixed', 'Per Hour', 'Per Sqm');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('Draft', 'Pending Deposit', 'Pending Final', 'Paid', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('Reserved', 'Paid', 'Scanned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: merchants
-- =============================================================================

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  feature_invoicing BOOLEAN NOT NULL DEFAULT true,
  feature_ticketing BOOLEAN NOT NULL DEFAULT false,
  ozow_site_code TEXT,
  ozow_private_key TEXT,
  ozow_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own record"
  ON merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Merchants can insert own record"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can update own record"
  ON merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can delete own record"
  ON merchants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- TABLE: clients
-- =============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email_address TEXT,
  region TEXT,
  is_subscribed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_clients_merchant_id ON clients(merchant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(merchant_id, phone_number);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: services
-- =============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  pricing_type pricing_type NOT NULL DEFAULT 'Fixed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_merchant_id ON services(merchant_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: quotes_invoices
-- =============================================================================

CREATE TABLE IF NOT EXISTS quotes_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status invoice_status NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  ozow_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_invoices_merchant_id ON quotes_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_invoices_client_id ON quotes_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_invoices_status ON quotes_invoices(merchant_id, status);

ALTER TABLE quotes_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own quotes and invoices"
  ON quotes_invoices FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own quotes and invoices"
  ON quotes_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own quotes and invoices"
  ON quotes_invoices FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own quotes and invoices"
  ON quotes_invoices FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: invoice_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES quotes_invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM quotes_invoices qi
      JOIN merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT qi.id FROM quotes_invoices qi
      JOIN merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM quotes_invoices qi
      JOIN merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT qi.id FROM quotes_invoices qi
      JOIN merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM quotes_invoices qi
      JOIN merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: events
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  ticket_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(merchant_id, event_date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own events"
  ON events FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: tickets
-- =============================================================================

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status ticket_status NOT NULL DEFAULT 'Reserved',
  qr_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_hash ON tickets(qr_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(event_id, status);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN merchants m ON e.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN merchants m ON e.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update own tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN merchants m ON e.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN merchants m ON e.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN merchants m ON e.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

-- =============================================================================
-- HELPER FUNCTION: Get current merchant ID
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_merchant_id()
RETURNS UUID AS $$
  SELECT id FROM merchants WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;