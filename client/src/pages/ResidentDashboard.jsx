import { useAuth } from "../context/AuthContext";

export default function ResidentDashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Resident Portal</h1>
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
          Welcome to the apartment management portal. Complaints, maintenance
          payments, and notices will appear here in later phases.
        </p>
      </section>
    </main>
  );
}
