import { useAuth } from "../context/AuthContext";

export default function PlatformDashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Platform Admin</h1>
          <p>
            Signed in as {user?.email} ({user?.role})
          </p>
        </div>
        <button type="button" onClick={() => logout()}>
          Log out
        </button>
      </header>
      <section>
        <p>
          Platform superadmin portal. Society management and cross-tenant
          support tools will be added in later phases.
        </p>
      </section>
    </main>
  );
}
