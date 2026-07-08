# AMS — Apartment Management System

AMS is a web application for apartment societies and housing associations. It gives residents a single place to stay connected with their building, and gives society staff the tools to manage day-to-day operations — from resident records to maintenance and finances.

## What it does

- **Resident portal** — Owners and tenants log in to access their apartment dashboard
- **Staff portal** — Managers, admins, association staff, and treasurers manage society operations from a separate dashboard
- **Building structure** — Organizes the society into blocks, flats, and residents
- **Secure access** — Role-based authentication so each user only sees what they're allowed to
- **Complaints & maintenance** — Track issues and maintenance requests (in development)
- **Payments & dues** — Handle maintenance billing and payment records (in development)
- **Notices** — Share announcements with residents (in development)

## Who uses it

| Role | Description |
| ---- | ----------- |
| Resident | Flat owner with full resident access |
| Tenant | Rented flat occupant |
| Manager | Day-to-day society operations |
| Admin | Full administrative control |
| Association staff | General staff access |
| Treasurer | Financial records and payments |

Residents and tenants use the **resident portal**. All other roles use the **staff portal**.

## Tech stack

- **Frontend** — React, Vite, React Router
- **Backend** — Node.js, Express
- **Database** — PostgreSQL (Neon)
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

After seeding, you can sign in with any of these (password: `password123`):

| Email | Role |
| ----- | ---- |
| `resident@ams.local` | Resident |
| `tenant@ams.local` | Tenant |
| `manager@ams.local` | Manager |
| `admin@ams.local` | Admin |
| `staff@ams.local` | Association staff |
| `treasurer@ams.local` | Treasurer |

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
| `npm run test` | Run server tests |

## License

Private project. All rights reserved.
