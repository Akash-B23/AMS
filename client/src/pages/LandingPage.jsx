import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";

const FEATURES = [
  {
    title: "Multi-tenant by design",
    description:
      "Each society is a separate tenant with its own blocks, flats, residents, and staff. Data is isolated at the database level with Postgres Row-Level Security.",
    status: "live",
  },
  {
    title: "Self-service society onboarding",
    description:
      "Register your society, claim a unique URL slug, and run a first-time setup wizard for blocks, flats, and maintenance amounts.",
    status: "live",
  },
  {
    title: "Master data bulk upload",
    description:
      "Managers and admins can import blocks, flats, maintenance amounts, and amenities via CSV — no manual one-by-one entry.",
    status: "live",
  },
  {
    title: "Resident self-service profile",
    description:
      "Owners and tenants update contact details and register vehicles from their own portal, scoped to their flat.",
    status: "live",
  },
  {
    title: "Complaints & maintenance requests",
    description:
      "Residents raise issues; managers and admins update status with optional staff notes.",
    status: "live",
  },
  {
    title: "Maintenance billing & payments",
    description:
      "Generate dues, collect transaction IDs from residents, and verify payments before marking invoices paid.",
    status: "live",
  },
];

const ROLES = [
  { name: "Resident / Tenant", portal: "Resident portal", detail: "Profile, dues, complaints" },
  { name: "Manager / Admin", portal: "Staff portal", detail: "Complaints, master data, operations" },
  { name: "Treasurer / Staff", portal: "Staff portal", detail: "Finance and day-to-day tasks" },
  { name: "Platform superadmin", portal: "Platform login", detail: "Cross-tenant support only" },
];

const STEPS = [
  {
    step: "1",
    title: "Create your society",
    description:
      "Sign up with your society name, choose a URL slug (e.g. greenview-apartments), and create the first admin account.",
  },
  {
    step: "2",
    title: "Set up your building",
    description:
      "Import blocks and flats, set per-flat maintenance amounts, and finish the setup wizard before going live.",
  },
  {
    step: "3",
    title: "Invite residents & staff",
    description:
      "Residents log in at your society URL. Staff manage complaints, master data, and billing.",
  },
];

function StatusBadge({ status }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Available now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
      Coming soon
    </span>
  );
}

export default function LandingPage() {
  const { user, loading, homePathForRole, logout } = useAuth();

  if (!loading && user) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link to="/" className="text-sm font-semibold text-brand-700 no-underline">
              AMS
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to={homePathForRole(user.role, user.societySlug, user.setupComplete)}
                className="text-sm font-medium text-slate-700 no-underline hover:text-brand-700"
              >
                Go to dashboard
              </Link>
              <Button variant="secondary" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            You are already signed in
          </h1>
          <p className="mt-3 text-slate-600">
            Continue to your {user.societyName ?? "platform"} dashboard.
          </p>
          <Link
            to={homePathForRole(user.role, user.societySlug, user.setupComplete)}
            className="mt-6 inline-block"
          >
            <Button>Open dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-sm font-bold tracking-wide text-brand-700 no-underline">
            AMS
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#features" className="no-underline hover:text-brand-700">
              Features
            </a>
            <a href="#how-it-works" className="no-underline hover:text-brand-700">
              How it works
            </a>
            <a href="#demo" className="no-underline hover:text-brand-700">
              Demo access
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/greenview-apartments/login" className="hidden sm:inline">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button>Create society</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                Apartment Management System
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Run your housing society on one secure, multi-tenant platform
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                AMS helps apartment associations manage blocks, flats, residents,
                and staff — each society on its own isolated tenant with role-based
                access. Residents use a simple mobile-friendly portal; staff get
                tools for master data and operations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup">
                  <Button className="px-6">Register your society</Button>
                </Link>
                <Link to="/greenview-apartments/login">
                  <Button variant="secondary" className="px-6">
                    Try demo login
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Already have a society URL? Sign in at{" "}
                <span className="font-mono text-slate-700">/your-society-slug/login</span>
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-slate-900">What AMS does</h2>
            <p className="mt-2 text-slate-600">
              Built for real societies — secure tenant isolation, clear roles, and
              features that expand as your community grows.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <StatusBadge status={feature.status} />
                <h3 className="mt-3 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              New societies go live in three steps. No separate scripts or manual
              database setup — everything runs through the app.
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((item) => (
                <li
                  key={item.step}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Who uses AMS</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Every role sees only what they need. Residents never access staff tools;
            society admins never see other societies.
          </p>
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Portal</th>
                  <th className="px-4 py-3 font-medium">Typical use</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role.name} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
                    <td className="px-4 py-3 text-slate-700">{role.portal}</td>
                    <td className="px-4 py-3 text-slate-600">{role.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="demo" className="border-t border-slate-200 bg-brand-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold text-slate-900">Try the demo</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Two seed societies are available for testing. Use password{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm text-slate-800">
                password123
              </code>{" "}
              for all demo accounts.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">Greenview Apartments</h3>
                <p className="mt-1 text-sm text-slate-600">Demo tenant · 2 blocks, seed residents</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>
                    Resident:{" "}
                    <span className="font-mono text-xs">resident@ams.local</span>
                  </li>
                  <li>
                    Manager:{" "}
                    <span className="font-mono text-xs">manager@ams.local</span>
                  </li>
                  <li>
                    Admin:{" "}
                    <span className="font-mono text-xs">admin@ams.local</span>
                  </li>
                </ul>
                <Link to="/greenview-apartments/login" className="mt-4 inline-block">
                  <Button variant="secondary">Sign in to Greenview</Button>
                </Link>
              </div>
              <div className="rounded-xl border border-brand-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">Sunrise Heights</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Second demo tenant · proves multi-tenant isolation
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>
                    Same emails, different society — data stays separate
                  </li>
                  <li>
                    URL:{" "}
                    <span className="font-mono text-xs">/sunrise-heights/login</span>
                  </li>
                </ul>
                <Link to="/sunrise-heights/login" className="mt-4 inline-block">
                  <Button variant="secondary">Sign in to Sunrise</Button>
                </Link>
              </div>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Platform support login:{" "}
              <Link to="/platform/login" className="font-medium">
                /platform/login
              </Link>{" "}
              · <span className="font-mono text-xs">superadmin@ams.local</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-semibold text-slate-900">AMS</span> — Apartment
            Management System
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/signup" className="font-medium text-brand-700">
              Create society
            </Link>
            <Link to="/greenview-apartments/login" className="font-medium text-brand-700">
              Society login
            </Link>
            <Link to="/platform/login" className="font-medium text-brand-700">
              Platform login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
