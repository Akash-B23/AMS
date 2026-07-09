-- Multi-tenant foundation: societies (tenant boundary) + RLS

CREATE TYPE user_role AS ENUM (
  'resident',
  'tenant',
  'manager',
  'admin',
  'association_staff',
  'treasurer',
  'platform_superadmin'
);

CREATE TYPE resident_type AS ENUM ('owner', 'tenant');

CREATE TABLE societies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (society_id, name)
);

CREATE TABLE flats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  block_id UUID NOT NULL REFERENCES blocks(id),
  flat_number VARCHAR(20) NOT NULL,
  floor INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (block_id, flat_number)
);

CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  flat_id UUID NOT NULL REFERENCES flats(id),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  resident_type resident_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  resident_id UUID REFERENCES residents(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_society_role_check CHECK (
    (role = 'platform_superadmin' AND society_id IS NULL)
    OR (role <> 'platform_superadmin' AND society_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_users_society_email ON users (society_id, email)
  WHERE society_id IS NOT NULL;

CREATE UNIQUE INDEX idx_users_platform_email ON users (email)
  WHERE role = 'platform_superadmin';

CREATE INDEX idx_blocks_society_id ON blocks(society_id);
CREATE INDEX idx_flats_society_id ON flats(society_id);
CREATE INDEX idx_flats_block_id ON flats(block_id);
CREATE INDEX idx_residents_society_id ON residents(society_id);
CREATE INDEX idx_residents_flat_id ON residents(flat_id);
CREATE INDEX idx_users_society_id ON users(society_id);
CREATE INDEX idx_users_resident_id ON users(resident_id);

ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE societies FORCE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE flats FORCE ROW LEVEL SECURITY;
ALTER TABLE residents FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY societies_tenant_isolation ON societies
  FOR ALL
  USING (id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY societies_platform_bypass ON societies
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY blocks_tenant_isolation ON blocks
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY blocks_platform_bypass ON blocks
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY flats_tenant_isolation ON flats
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY flats_platform_bypass ON flats
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY residents_tenant_isolation ON residents
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY residents_platform_bypass ON residents
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY users_platform_bypass ON users
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE ROLE ams_app NOINHERIT;

GRANT USAGE ON SCHEMA public TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON societies TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON blocks TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON flats TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON residents TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO ams_app;
GRANT ams_app TO CURRENT_USER;
