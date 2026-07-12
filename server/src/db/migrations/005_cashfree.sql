-- Migrate payments from Razorpay Route to Cashfree Easy Split

ALTER TABLE societies
  RENAME COLUMN razorpay_linked_account_id TO cashfree_vendor_id;

ALTER TABLE payments
  RENAME COLUMN razorpay_order_id TO cashfree_order_id;

ALTER TABLE payments
  RENAME COLUMN razorpay_payment_id TO cashfree_payment_id;

DROP INDEX IF EXISTS idx_payments_razorpay_order_id;
DROP INDEX IF EXISTS idx_payments_razorpay_payment_id;

CREATE UNIQUE INDEX idx_payments_cashfree_order_id
  ON payments (cashfree_order_id)
  WHERE cashfree_order_id IS NOT NULL;

CREATE UNIQUE INDEX idx_payments_cashfree_payment_id
  ON payments (cashfree_payment_id)
  WHERE cashfree_payment_id IS NOT NULL;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cashfree';
