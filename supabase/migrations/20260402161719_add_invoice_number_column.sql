/*
  # Add invoice_number column to quotes_invoices

  1. Changes
    - Add `invoice_number` column to `quotes_invoices` table
    - Column is auto-generated using a sequence for sequential numbering
    - Format: INV-XXXX (e.g., INV-0001, INV-0002)

  2. Notes
    - Existing invoices will receive auto-generated numbers
    - New invoices will automatically get the next number in sequence
*/

-- Create a sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Add invoice_number column with auto-generated default
ALTER TABLE quotes_invoices
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Update existing rows with generated invoice numbers
UPDATE quotes_invoices
SET invoice_number = 'INV-' || LPAD(nextval('invoice_number_seq')::text, 4, '0')
WHERE invoice_number IS NULL;

-- Create a function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice number on insert
DROP TRIGGER IF EXISTS set_invoice_number ON quotes_invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON quotes_invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();