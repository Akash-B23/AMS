-- Phase 2: master data (amenities) and resident vehicles

CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (society_id, name)
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  registration_number VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'car',
  make_model VARCHAR(100),
  parking_slot VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicles_type_check CHECK (vehicle_type IN ('car', 'bike', 'other'))
);

CREATE UNIQUE INDEX idx_vehicles_society_registration
  ON vehicles (society_id, registration_number)
  WHERE is_active = true;

CREATE INDEX idx_amenities_society_id ON amenities(society_id);
CREATE INDEX idx_vehicles_society_id ON vehicles(society_id);
CREATE INDEX idx_vehicles_resident_id ON vehicles(resident_id);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

ALTER TABLE amenities FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;

CREATE POLICY amenities_tenant_isolation ON amenities
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY amenities_platform_bypass ON amenities
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY vehicles_tenant_isolation ON vehicles
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY vehicles_platform_bypass ON vehicles
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON amenities TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO ams_app;
