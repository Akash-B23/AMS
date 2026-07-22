# AMS — Apartment Management System

AMS is a multi-tenant web application for apartment societies and housing associations. Each society is an isolated tenant — residents and staff log in through their society's URL, and data is enforced at the database level with Postgres Row-Level Security.

## What it does

- **Multi-tenant** — Each apartment society is a separate tenant with its own blocks, flats, residents, and users
- **Resident portal** — Owners and tenants log in to access their apartment dashboard
- **Staff portal** — Managers, admins, association staff, and treasurers manage society operations
- **Platform admin** — Platform superadmin for cross-tenant support (separate login)
- **Building structure** — Organizes each society into blocks, flats, and residents
- **Secure access** — Role-based authentication with RLS-enforced tenant isolation
- **Complaints & maintenance** — Residents raise issues; managers/admins update status
- **Payments & dues** — Maintenance billing with manual transaction-ID verification
- **Expenses & vendors** — Treasurer expense entry, vendor directory, quotation approve/reject
- **Maintenance activities** — Categorized society maintenance work logging for staff
- **Recurring maintenance** — Schedules that generate planned activities and notify staff
- **Reports** — Resident summary reports and staff collection/expense/complaints/maintenance reports with CSV download
- **Shareable summaries** — Formatted pending-dues and income/expense views with copy-to-clipboard and download-as-image (no WhatsApp integration)
- **Move-in / move-out** — Staff create resident logins on move-in; soft-deactivate on move-out with a pending-dues warning
- **Notifications** — In-app alerts plus optional SMTP or Resend email for invoice reminders and maintenance due

## Who uses it

| Role | Description |
| ---- | ----------- |
| Resident | Flat owner with full resident access |
| Tenant | Rented flat occupant |
| Manager | Day-to-day society operations |
| Admin | Society administrator (single-society only) |
| Association staff | General staff access |
| Treasurer | Financial records and payments |
| Platform superadmin | Cross-tenant platform support |

Residents and tenants use the **resident portal**. Society staff use the **staff portal**. Platform superadmin uses a separate **platform login**.

## Tech stack

- **Frontend** — React, Vite, React Router
- **Backend** — Node.js, Express
- **Database** — PostgreSQL (Neon) with Row-Level Security
- **Auth** — JWT sessions via HTTP-only cookies, bcrypt password hashing

## Project structure

```
AMS/
├── client/     # React frontend
└── server/     # Express API + database
```

The repo uses npm workspaces — install once at the root and both packages are linked.

## Running locally

**Requirements:** Node.js 18+, a PostgreSQL database ([Neon](https://neon.tech/) works well)

```bash
git clone <your-repo-url>
cd AMS
npm install
```

Create `server/.env` from the example and set your database URL and JWT secret:

```bash
cp server/.env.example server/.env
```

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Random secret for auth tokens |
| `PORT` | API port (default `3000`) |
| `CLIENT_ORIGIN` | Frontend URL (default `http://localhost:5173`) |
| `CRON_SECRET` | Bearer token for `/api/jobs/*` cron endpoints |
| `EMAIL_FROM` | From address for outbound mail (e.g. `AMS <noreply@yourdomain.com>`) |
| `SMTP_HOST` | Optional SMTP host (Nodemailer). If set, SMTP is used instead of Resend |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_SECURE` | `true` for TLS on connect (port 465); default `false` for STARTTLS |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |
| `RESEND_API_KEY` | Optional Resend API key (used only when `SMTP_HOST` is unset) |

Residents submit a bank/UPI transaction ID for each invoice; staff verify or reject before the invoice is marked paid.

Monthly invoice generation (1st of month), reminder emails, and due maintenance schedules can be triggered by an external cron:

```bash
curl -X POST "$API_URL/api/jobs/monthly-invoices" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$API_URL/api/jobs/reminders" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$API_URL/api/jobs/maintenance-schedules" -H "Authorization: Bearer $CRON_SECRET"
```

When neither `SMTP_HOST` nor `RESEND_API_KEY` is set, emails are recorded as skipped in `email_deliveries` (safe for local/dev). If `SMTP_HOST` is set, Nodemailer/SMTP is used; otherwise Resend is used when its API key is present.

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set up the database and start the app:

```bash
npm run db:migrate -w server
npm run db:seed -w server
npm run dev
```

The frontend runs at [http://localhost:5173](http://localhost:5173) and the API at [http://localhost:3000](http://localhost:3000).

> Do not commit `server/.env` — it contains secrets and is excluded via `.gitignore`.

## Demo logins

After seeding, sign in at a society URL (password: `password123`):

| URL | Email | Role |
| --- | ----- | ---- |
| `/greenview-apartments/login` | `resident@ams.local` | Resident |
| `/greenview-apartments/login` | `tenant@ams.local` | Tenant |
| `/greenview-apartments/login` | `manager@ams.local` | Manager |
| `/greenview-apartments/login` | `admin@ams.local` | Society admin |
| `/sunrise-heights/login` | `resident@ams.local` | Resident (Sunrise tenant) |
| `/platform/login` | `superadmin@ams.local` | Platform superadmin |

The same email can exist in multiple societies — login always requires the society slug in the URL.

## Available scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start frontend and backend |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run build` | Build frontend for production |
| `npm run db:migrate -w server` | Run database migrations |
| `npm run db:seed -w server` | Load demo data |
| `npm run db:reset -w server` | Reset database |
| `npm run test` | Run all server tests |
| `npm run test:phase-1` | Run multi-tenant isolation tests |
| `npm run test:phase-2` | Run master data & profile tests |
| `npm run test:phase-3` | Run invoicing & dues tests |
| `npm run test:phase-4` | Run complaints tests |
| `npm run test:phase-5` | Run expenses, vendors & activities tests |
| `npm run test:phase-6` | Run reporting, schedules & notifications tests |
| `npm run test:phase-7` | Run move-in/move-out & shareable reports tests |

## License

Private project. All rights reserved.
