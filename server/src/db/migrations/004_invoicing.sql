-- Phase 2: invoicing, payments, reminders, audit

ALTER TABLE societies
  ADD COLUMN IF NOT EXISTS razorpay_linked_account_id VARCHAR(64);

CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE payment_method AS ENUM (
  'razorpay',
  'cash',
  'cheque',
  'upi_offline',
  'other'
);
CREATE TYPE payment_status AS ENUM ('created', 'captured', 'failed');
CREATE TYPE reminder_channel AS ENUM ('email');
CREATE TYPE reminder_status AS ENUM ('recorded', 'skipped');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  flat_id UUID NOT NULL REFERENCES flats(id),
  billed_resident_id UUID NOT NULL REFERENCES residents(id),
  billing_period DATE NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status invoice_status NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (society_id, flat_id, billing_period),
  CONSTRAINT invoices_billing_period_first_of_month
    CHECK (EXTRACT(DAY FROM billing_period) = 1)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'created',
  razorpay_order_id VARCHAR(64),
  razorpay_payment_id VARCHAR(64),
  recorded_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payments_razorpay_order_id
  ON payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX idx_payments_razorpay_payment_id
  ON payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  channel reminder_channel NOT NULL DEFAULT 'email',
  status reminder_status NOT NULL DEFAULT 'recorded',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_society_id ON invoices(society_id);
CREATE INDEX idx_invoices_flat_id ON invoices(flat_id);
CREATE INDEX idx_invoices_billed_resident_id ON invoices(billed_resident_id);
CREATE INDEX idx_invoices_status ON invoices(society_id, status);
CREATE INDEX idx_invoices_billing_period ON invoices(society_id, billing_period);
CREATE INDEX idx_payments_society_id ON payments(society_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_reminder_logs_society_id ON reminder_logs(society_id);
CREATE INDEX idx_reminder_logs_invoice_id ON reminder_logs(invoice_id);
CREATE INDEX idx_audit_logs_society_id ON audit_logs(society_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY invoices_platform_bypass ON invoices
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY payments_tenant_isolation ON payments
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY payments_platform_bypass ON payments
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY reminder_logs_tenant_isolation ON reminder_logs
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY reminder_logs_platform_bypass ON reminder_logs
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY audit_logs_platform_bypass ON audit_logs
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON reminder_logs TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO ams_app;
