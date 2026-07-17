-- Replace Cashfree gateway columns with manual transaction-ref verification

DROP INDEX IF EXISTS idx_payments_cashfree_order_id;
DROP INDEX IF EXISTS idx_payments_cashfree_payment_id;

ALTER TABLE payments
  DROP COLUMN IF EXISTS cashfree_order_id,
  DROP COLUMN IF EXISTS cashfree_payment_id;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(128);

ALTER TABLE societies
  DROP COLUMN IF EXISTS cashfree_vendor_id;

CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref
  ON payments (society_id, transaction_ref)
  WHERE transaction_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_open
  ON payments (invoice_id)
  WHERE status = 'created';
