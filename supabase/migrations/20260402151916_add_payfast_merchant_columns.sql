/*
  # Add PayFast Payment Gateway Columns

  1. New Columns on `merchants` table
    - `payfast_merchant_id` (text) - PayFast merchant identifier
    - `payfast_merchant_key` (text) - PayFast merchant key for API authentication
    - `payfast_passphrase` (text) - Optional passphrase for signature verification
    - `payfast_sandbox_mode` (boolean) - Toggle between sandbox and production mode

  2. Notes
    - Existing Ozow columns are preserved for backwards compatibility
    - Default sandbox mode to true for safety
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'payfast_merchant_id'
  ) THEN
    ALTER TABLE merchants ADD COLUMN payfast_merchant_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'payfast_merchant_key'
  ) THEN
    ALTER TABLE merchants ADD COLUMN payfast_merchant_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'payfast_passphrase'
  ) THEN
    ALTER TABLE merchants ADD COLUMN payfast_passphrase text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'payfast_sandbox_mode'
  ) THEN
    ALTER TABLE merchants ADD COLUMN payfast_sandbox_mode boolean DEFAULT true;
  END IF;
END $$;