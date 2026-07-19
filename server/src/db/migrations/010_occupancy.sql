-- Phase 7: move-in / move-out occupancy tracking

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS moved_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moved_out_at TIMESTAMPTZ;

UPDATE residents
SET moved_in_at = COALESCE(moved_in_at, created_at);

ALTER TABLE residents
  ALTER COLUMN moved_in_at SET DEFAULT NOW(),
  ALTER COLUMN moved_in_at SET NOT NULL;

-- At most one active owner and one active tenant per flat
CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_one_active_owner_per_flat
  ON residents (flat_id)
  WHERE is_active = true AND resident_type = 'owner';

CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_one_active_tenant_per_flat
  ON residents (flat_id)
  WHERE is_active = true AND resident_type = 'tenant';

CREATE INDEX IF NOT EXISTS idx_residents_society_active
  ON residents (society_id, is_active);
