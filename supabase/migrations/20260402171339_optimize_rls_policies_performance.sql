/*
  # Optimize RLS Policies Performance

  1. Changes
    - Updates all RLS policies across all tables to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of the auth function for each row, improving query performance at scale

  2. Tables Affected
    - merchants (4 policies)
    - clients (4 policies)
    - services (4 policies)
    - invoice_items (4 policies)
    - events (4 policies)
    - quotes_invoices (4 policies)
    - tickets (4 policies)

  3. Security
    - No security changes, only performance optimization
    - All policies maintain the same access control logic
*/

-- Drop and recreate merchants policies
DROP POLICY IF EXISTS "Merchants can view own record" ON merchants;
DROP POLICY IF EXISTS "Merchants can insert own record" ON merchants;
DROP POLICY IF EXISTS "Merchants can update own record" ON merchants;
DROP POLICY IF EXISTS "Merchants can delete own record" ON merchants;

CREATE POLICY "Merchants can view own record"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Merchants can insert own record"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Merchants can update own record"
  ON merchants FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Merchants can delete own record"
  ON merchants FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate clients policies
DROP POLICY IF EXISTS "Merchants can view own clients" ON clients;
DROP POLICY IF EXISTS "Merchants can insert own clients" ON clients;
DROP POLICY IF EXISTS "Merchants can update own clients" ON clients;
DROP POLICY IF EXISTS "Merchants can delete own clients" ON clients;

CREATE POLICY "Merchants can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

-- Drop and recreate services policies
DROP POLICY IF EXISTS "Merchants can view own services" ON services;
DROP POLICY IF EXISTS "Merchants can insert own services" ON services;
DROP POLICY IF EXISTS "Merchants can update own services" ON services;
DROP POLICY IF EXISTS "Merchants can delete own services" ON services;

CREATE POLICY "Merchants can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

-- Drop and recreate invoice_items policies
DROP POLICY IF EXISTS "Merchants can view own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Merchants can insert own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Merchants can update own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Merchants can delete own invoice items" ON invoice_items;

CREATE POLICY "Merchants can view own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (invoice_id IN (
    SELECT qi.id FROM quotes_invoices qi
    JOIN merchants m ON qi.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (invoice_id IN (
    SELECT qi.id FROM quotes_invoices qi
    JOIN merchants m ON qi.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (invoice_id IN (
    SELECT qi.id FROM quotes_invoices qi
    JOIN merchants m ON qi.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ))
  WITH CHECK (invoice_id IN (
    SELECT qi.id FROM quotes_invoices qi
    JOIN merchants m ON qi.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (invoice_id IN (
    SELECT qi.id FROM quotes_invoices qi
    JOIN merchants m ON qi.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

-- Drop and recreate events policies
DROP POLICY IF EXISTS "Merchants can view own events" ON events;
DROP POLICY IF EXISTS "Merchants can insert own events" ON events;
DROP POLICY IF EXISTS "Merchants can update own events" ON events;
DROP POLICY IF EXISTS "Merchants can delete own events" ON events;

CREATE POLICY "Merchants can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can insert own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can delete own events"
  ON events FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

-- Drop and recreate quotes_invoices policies
DROP POLICY IF EXISTS "Merchants can view own quotes and invoices" ON quotes_invoices;
DROP POLICY IF EXISTS "Merchants can insert own quotes and invoices" ON quotes_invoices;
DROP POLICY IF EXISTS "Merchants can update own quotes and invoices" ON quotes_invoices;
DROP POLICY IF EXISTS "Merchants can delete own quotes and invoices" ON quotes_invoices;

CREATE POLICY "Merchants can view own quotes and invoices"
  ON quotes_invoices FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can insert own quotes and invoices"
  ON quotes_invoices FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can update own quotes and invoices"
  ON quotes_invoices FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Merchants can delete own quotes and invoices"
  ON quotes_invoices FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = (select auth.uid())));

-- Drop and recreate tickets policies
DROP POLICY IF EXISTS "Merchants can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Merchants can insert own tickets" ON tickets;
DROP POLICY IF EXISTS "Merchants can update own tickets" ON tickets;
DROP POLICY IF EXISTS "Merchants can delete own tickets" ON tickets;

CREATE POLICY "Merchants can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN merchants m ON e.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can insert own tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (event_id IN (
    SELECT e.id FROM events e
    JOIN merchants m ON e.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can update own tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN merchants m ON e.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ))
  WITH CHECK (event_id IN (
    SELECT e.id FROM events e
    JOIN merchants m ON e.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));

CREATE POLICY "Merchants can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN merchants m ON e.merchant_id = m.id
    WHERE m.user_id = (select auth.uid())
  ));