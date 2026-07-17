-- Phase 4: resident complaints + staff status updates

CREATE TYPE complaint_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed',
  'rejected'
);

CREATE TYPE complaint_category AS ENUM (
  'plumbing',
  'electrical',
  'civil',
  'security',
  'housekeeping',
  'lift',
  'parking',
  'noise',
  'other'
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  flat_id UUID NOT NULL REFERENCES flats(id),
  raised_by_resident_id UUID NOT NULL REFERENCES residents(id),
  raised_by_user_id UUID NOT NULL REFERENCES users(id),
  category complaint_category NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  staff_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_society_id ON complaints(society_id);
CREATE INDEX idx_complaints_status ON complaints(society_id, status);
CREATE INDEX idx_complaints_raised_by_resident_id ON complaints(raised_by_resident_id);
CREATE INDEX idx_complaints_flat_id ON complaints(flat_id);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints FORCE ROW LEVEL SECURITY;

CREATE POLICY complaints_tenant_isolation ON complaints
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY complaints_platform_bypass ON complaints
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON complaints TO ams_app;
