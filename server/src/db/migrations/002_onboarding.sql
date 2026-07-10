-- Phase 0.5: society onboarding and per-flat maintenance amounts

ALTER TABLE societies
  ADD COLUMN setup_completed_at TIMESTAMPTZ NULL;

ALTER TABLE flats
  ADD COLUMN maintenance_amount_paise INTEGER NULL;

ALTER TABLE users
  ADD COLUMN display_name VARCHAR(200) NULL;
