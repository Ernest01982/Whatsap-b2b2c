/*
  # Optimize RLS Policies and Function Security

  1. RLS Policy Optimization
    - Updates all RLS policies across all tables to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth.uid() for each row, improving query performance at scale
    - Affected tables: merchants, clients, services, invoice_items, events, quotes_invoices, tickets

  2. Function Security
    - Sets explicit search_path for all custom functions to prevent search_path injection attacks
    - Affected functions: get_current_merchant_id, handle_new_user, generate_invoice_number

  3. Security Notes
    - All policies maintain the same access control logic
    - Only the performance optimization pattern changes
    - Functions now use immutable search_path for security
*/

-- =====================================================
-- MERCHANTS TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own record" ON public.merchants;
CREATE POLICY "Merchants can view own record"
  ON public.merchants
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Merchants can insert own record" ON public.merchants;
CREATE POLICY "Merchants can insert own record"
  ON public.merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Merchants can update own record" ON public.merchants;
CREATE POLICY "Merchants can update own record"
  ON public.merchants
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Merchants can delete own record" ON public.merchants;
CREATE POLICY "Merchants can delete own record"
  ON public.merchants
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- CLIENTS TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own clients" ON public.clients;
CREATE POLICY "Merchants can view own clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own clients" ON public.clients;
CREATE POLICY "Merchants can insert own clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own clients" ON public.clients;
CREATE POLICY "Merchants can update own clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own clients" ON public.clients;
CREATE POLICY "Merchants can delete own clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- SERVICES TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own services" ON public.services;
CREATE POLICY "Merchants can view own services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own services" ON public.services;
CREATE POLICY "Merchants can insert own services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own services" ON public.services;
CREATE POLICY "Merchants can update own services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own services" ON public.services;
CREATE POLICY "Merchants can delete own services"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- INVOICE_ITEMS TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own invoice items" ON public.invoice_items;
CREATE POLICY "Merchants can view own invoice items"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM public.quotes_invoices qi
      JOIN public.merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own invoice items" ON public.invoice_items;
CREATE POLICY "Merchants can insert own invoice items"
  ON public.invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT qi.id FROM public.quotes_invoices qi
      JOIN public.merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own invoice items" ON public.invoice_items;
CREATE POLICY "Merchants can update own invoice items"
  ON public.invoice_items
  FOR UPDATE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM public.quotes_invoices qi
      JOIN public.merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT qi.id FROM public.quotes_invoices qi
      JOIN public.merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own invoice items" ON public.invoice_items;
CREATE POLICY "Merchants can delete own invoice items"
  ON public.invoice_items
  FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT qi.id FROM public.quotes_invoices qi
      JOIN public.merchants m ON qi.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- EVENTS TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own events" ON public.events;
CREATE POLICY "Merchants can view own events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own events" ON public.events;
CREATE POLICY "Merchants can insert own events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own events" ON public.events;
CREATE POLICY "Merchants can update own events"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own events" ON public.events;
CREATE POLICY "Merchants can delete own events"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- QUOTES_INVOICES TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own quotes and invoices" ON public.quotes_invoices;
CREATE POLICY "Merchants can view own quotes and invoices"
  ON public.quotes_invoices
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own quotes and invoices" ON public.quotes_invoices;
CREATE POLICY "Merchants can insert own quotes and invoices"
  ON public.quotes_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own quotes and invoices" ON public.quotes_invoices;
CREATE POLICY "Merchants can update own quotes and invoices"
  ON public.quotes_invoices
  FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own quotes and invoices" ON public.quotes_invoices;
CREATE POLICY "Merchants can delete own quotes and invoices"
  ON public.quotes_invoices
  FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- TICKETS TABLE - Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Merchants can view own tickets" ON public.tickets;
CREATE POLICY "Merchants can view own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can insert own tickets" ON public.tickets;
CREATE POLICY "Merchants can insert own tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can update own tickets" ON public.tickets;
CREATE POLICY "Merchants can update own tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Merchants can delete own tickets" ON public.tickets;
CREATE POLICY "Merchants can delete own tickets"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- FUNCTIONS - Fix search_path security
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_merchant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchants (user_id, business_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
  merchant_prefix text;
BEGIN
  IF NEW.invoice_number IS NULL AND NEW.type = 'invoice' THEN
    SELECT COALESCE(MAX(
      CASE 
        WHEN invoice_number ~ '^\d+$' THEN invoice_number::integer
        WHEN invoice_number ~ '-(\d+)$' THEN (regexp_match(invoice_number, '-(\d+)$'))[1]::integer
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM public.quotes_invoices
    WHERE merchant_id = NEW.merchant_id AND type = 'invoice';
    
    SELECT COALESCE(UPPER(LEFT(REGEXP_REPLACE(business_name, '[^a-zA-Z]', '', 'g'), 3)), 'INV')
    INTO merchant_prefix
    FROM public.merchants
    WHERE id = NEW.merchant_id;
    
    NEW.invoice_number := merchant_prefix || '-' || LPAD(next_number::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;