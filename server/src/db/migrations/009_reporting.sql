-- Phase 6: reporting, recurring maintenance schedules, notifications, email deliveries

CREATE TYPE maintenance_schedule_frequency AS ENUM (
  'weekly',
  'monthly',
  'quarterly'
);

CREATE TYPE email_delivery_status AS ENUM (
  'queued',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category complaint_category NOT NULL DEFAULT 'other',
  vendor_id UUID REFERENCES vendors(id),
  frequency maintenance_schedule_frequency NOT NULL,
  day_of_week SMALLINT CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  day_of_month SMALLINT CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28)),
  notify_days_before INTEGER NOT NULL DEFAULT 3 CHECK (notify_days_before >= 0 AND notify_days_before <= 30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_due_date DATE NOT NULL,
  last_generated_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_schedules_weekly_day CHECK (
    frequency <> 'weekly' OR day_of_week IS NOT NULL
  ),
  CONSTRAINT maintenance_schedules_month_day CHECK (
    frequency = 'weekly' OR day_of_month IS NOT NULL
  )
);

ALTER TABLE maintenance_activities
  ADD COLUMN schedule_id UUID REFERENCES maintenance_schedules(id);

CREATE UNIQUE INDEX idx_maintenance_activities_schedule_date
  ON maintenance_activities (society_id, schedule_id, activity_date)
  WHERE schedule_id IS NOT NULL;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES societies(id),
  user_id UUID REFERENCES users(id),
  to_email VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  provider_message_id VARCHAR(255),
  status email_delivery_status NOT NULL DEFAULT 'queued',
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_schedules_society_id ON maintenance_schedules(society_id);
CREATE INDEX idx_maintenance_schedules_active_due
  ON maintenance_schedules(society_id, is_active, next_due_date);
CREATE INDEX idx_maintenance_activities_schedule_id ON maintenance_activities(schedule_id);
CREATE INDEX idx_notifications_user_society
  ON notifications(user_id, society_id, created_at DESC);
CREATE INDEX idx_notifications_unread
  ON notifications(user_id, society_id)
  WHERE read_at IS NULL;
CREATE INDEX idx_email_deliveries_society_id ON email_deliveries(society_id);
CREATE INDEX idx_email_deliveries_status ON email_deliveries(society_id, status);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

ALTER TABLE maintenance_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY maintenance_schedules_tenant_isolation ON maintenance_schedules
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY maintenance_schedules_platform_bypass ON maintenance_schedules
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY notifications_tenant_isolation ON notifications
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY notifications_platform_bypass ON notifications
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

CREATE POLICY email_deliveries_tenant_isolation ON email_deliveries
  FOR ALL
  USING (society_id = NULLIF(current_setting('app.society_id', true), '')::uuid);

CREATE POLICY email_deliveries_platform_bypass ON email_deliveries
  FOR ALL
  USING (current_setting('app.is_platform_superadmin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO ams_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_deliveries TO ams_app;
