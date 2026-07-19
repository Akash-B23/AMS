-- Phase 5: expenses, vendors, quotations, maintenance activities

CREATE TYPE quotation_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE expense_category AS ENUM (
  'utilities',
  'repairs',
  'security',
  'housekeeping',
  'landscaping',
  'salaries',
  'supplies',
  'other'
);

CREATE TYPE maintenance_activity_status AS ENUM (
  'planned',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status quotation_status NOT NULL DEFAULT 'pending',
  submitted_by_user_id UUID NOT NULL REFERENCES users(id),
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  vendor_id UUID REFERENCES vendors(id),
  quotation_id UUID REFERENCES quotations(id),
  category expense_category NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  vendor_id UUID REFERENCES vendors(id),
  category complaint_category NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status maintenance_activity_status NOT NULL DEFAULT 'planned',
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_society_id ON vendors(society_id);
CREATE INDEX idx_vendors_active ON vendors(society_id, is_active);
CREATE INDEX idx_quotations_society_id ON quotations(society_id);
CREATE INDEX idx_quotations_status ON quotations(society_id, status);
CREATE INDEX idx_quotations_vendor_id ON quotations(vendor_id);
CREATE INDEX idx_expenses_society_id ON expenses(society_id);
CREATE INDEX idx_expenses_category ON expenses(society_id, category);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX idx_expenses_quotation_id ON expenses(quotation_id);
CREATE INDEX idx_maintenance_activities_society_id ON maintenance_activities(society_id);
CREATE INDEX idx_maintenance_activities_status ON maintenance_activities(society_id, status);
CREATE INDEX idx_maintenance_activities_category ON maintenance_activities(society_id, category);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE vendors FORCE ROW LEVEL SECURITY;
ALTER TABLE quotations FORCE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE maintenance_activities FORCE ROW LEVEL SECURITY;

CREATE POLICY vendors_tenant_isolation ON vendors
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY vendors_platform_bypass ON vendors
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY quotations_tenant_isolation ON quotations
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY quotations_platform_bypass ON quotations
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY expenses_tenant_isolation ON expenses
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY expenses_platform_bypass ON expenses
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY maintenance_activities_tenant_isolation ON maintenance_activities
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY maintenance_activities_platform_bypass ON maintenance_activities
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON vendors TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quotations TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_activities TO ams_app;
