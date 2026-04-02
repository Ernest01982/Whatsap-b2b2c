/*
  # Fix Function Search Paths

  1. Changes
    - Updates functions to use explicit search_path setting
    - Prevents role mutable search_path security issues

  2. Functions Updated
    - get_current_merchant_id
    - handle_new_user
    - generate_invoice_number

  3. Security
    - Sets search_path to empty string to prevent search_path injection attacks
*/

-- Fix get_current_merchant_id function
CREATE OR REPLACE FUNCTION public.get_current_merchant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.merchants (user_id, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'));
  RETURN NEW;
END;
$$;

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_merchant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_year text;
  v_month text;
  v_count integer;
  v_invoice_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  v_month := to_char(CURRENT_DATE, 'MM');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.quotes_invoices
  WHERE merchant_id = p_merchant_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
  
  v_invoice_number := 'INV-' || v_year || v_month || '-' || lpad(v_count::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;