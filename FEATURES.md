# AMS — Feature List

All product features shipped through Phase 7, organized by phase.

---

## Phase 0 — Foundations

- Landing page with product overview and demo society links
- Society-scoped login (`/:societySlug/login`) with email + password
- JWT session via HTTP-only cookies; logout clears the session
- Current-user (`/me`) with identity, role, and society context
- API health check
- Role-aware unauthorized / access-denied handling
- Seeded demo data: societies, blocks, flats, residents, users (bcrypt passwords)

---

## Phase 0.5 — Society Onboarding

- Self-service society signup (name, unique slug, first admin account)
- Slug availability check (rejects reserved values like `platform`, `signup`)
- First-time setup wizard for new admins:
  - Import blocks and flats (CSV or manual)
  - Set per-flat maintenance amounts
  - Complete setup to unlock the staff portal
- Incomplete setup redirects admin to the wizard instead of staff tools

---

## Phase 1 — Multi-Tenant Foundations

- Each society is an isolated tenant with a unique URL slug
- Same email can exist in multiple societies; login requires the correct slug
- Postgres Row-Level Security (RLS) on tenant-scoped tables
- Platform superadmin login (`/platform/login`) separate from society login
- Platform admin dashboard shell (cross-tenant society management UI deferred)

---

## Phase 2 — Master Data & Resident Self-Service

### Staff master data

- Society summary / overview counts
- Bulk import flats (block, flat number, floor)
- Bulk import maintenance amounts per flat (stored as paise)
- Bulk import amenities
- List flats and amenities

### Resident portal

- View profile (flat, resident type, contact info)
- Update name and phone
- Vehicle registry — add, edit, delete (registration, type, make/model, parking slot)

---

## Phase 3 — Invoicing & Dues

### Billing

- Monthly maintenance invoice generation per flat (idempotent)
- Staff pending-dues view across the society
- Generate invoices for a billing month
- Verify or reject resident-submitted payment references (UTR / transaction ID)
- Mark invoices paid offline (cash, cheque, etc.)
- Invoice reminder emails (staff-triggered or cron)

### Resident portal

- View dues and invoice status (pending, overdue, paid, awaiting verification)
- Submit bank/UPI transaction ID (confirmation step); staff verification required before paid
- Resubmit after rejection

### Jobs

- Cron: monthly invoice generation (`/api/jobs/monthly-invoices`)
- Cron: reminder emails (`/api/jobs/reminders`)

*No online payment gateway — manual transaction-ID verification only.*

---

## Phase 4 — Complaints

### Residents / tenants

- Raise a complaint (category, title, description)
- List and track own complaints only

### Staff (manager / admin)

- Society-wide complaint queue with flat/resident context
- Update status (open, in progress, resolved, closed, rejected) and staff notes

---

## Phase 5 — Expenses, Vendors & Maintenance Activities

### Vendors & quotations

- Vendor directory (create, list, update)
- Quotation intake with approve / reject (+ reason)

### Expenses

- Record society expenses by category
- Optional link to vendor / quotation
- List expenses

### Maintenance activities

- Log categorized maintenance work
- Status workflow: planned → in progress → completed / cancelled

---

## Phase 6 — Reporting, Schedules & Notifications

### Resident reports

- Personal summary (invoices, complaints by status, upcoming maintenance)
- Invoice history with CSV download

### Staff reports

- Collection and expense reports (admin / treasurer)
- Complaints report (manager / admin / association staff)
- Maintenance report (manager / admin / treasurer / association staff)
- CSV export for loaded sections

### Recurring maintenance

- Schedules with weekly / monthly / quarterly frequency
- Auto-generates planned activities on due dates (cron, idempotent)
- Notify-days-before support

### Notifications & email

- In-app notifications (list, mark read, mark all read) for residents and staff
- Optional email for invoice reminders and maintenance due via SMTP (Nodemailer) or Resend
- Without SMTP or Resend configured, emails are recorded as skipped (safe for local/dev)

---

## Phase 7 — Move-in / Move-out & Shareable Reports

### Occupancy

- Staff residents page (admin / manager)
- Move-in: create resident + login (email + temporary password)
  - Role mapping: owner → resident, tenant → tenant
- At most one active owner and one active tenant per flat
- Move-out: soft-deactivate resident and user; record move-in / move-out timestamps
- Pending-dues warning on move-out (counts/amounts); staff can confirm and proceed
- Filter active vs moved-out residents

### Shareable summaries (admin / treasurer)

- Formatted pending-dues report (by flat/resident, totals, overdue)
- Formatted income vs expense summary (category breakdown + net)
- Copy plain text to clipboard (for manual group-chat paste)
- Download as PNG image
- No WhatsApp or messaging API integration

---

## Cross-cutting

| Area | Capability |
| ---- | ---------- |
| **Auth** | JWT cookies, bcrypt passwords, role checks on every protected route |
| **Roles** | resident, tenant, manager, admin, association_staff, treasurer, platform_superadmin |
| **Multi-tenancy** | `society_id` on tenant tables, RLS + app-layer filters, slug-based URLs |
| **Money** | Amounts stored as integer paise; displayed as rupees |
| **Audit** | Audit logs for invoice, payment, reminder, and key financial/ops actions |
| **Cron** | `CRON_SECRET`-protected jobs: monthly invoices, reminders, maintenance schedules |

---

## Roles at a glance

| Role | Main capabilities |
| ---- | ----------------- |
| **Resident / tenant** | Profile, vehicles, dues & payment refs, complaints, personal reports, notifications |
| **Manager** | Master data, complaints, residents (move-in/out), maintenance activities & schedules, ops reports |
| **Admin** | Manager capabilities + invoicing, expenses/vendors, shareable summaries, society setup |
| **Treasurer** | Dues, expenses, vendors, shareable summaries, finance reports, maintenance activities/schedules |
| **Association staff** | Notifications; complaints & maintenance reports (not finance modules) |
| **Platform superadmin** | Cross-tenant platform login and dashboard shell |
