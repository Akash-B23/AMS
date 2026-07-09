import { useAuth } from "../context/AuthContext";

export default function StaffDashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Staff Portal</h1>
          <p>
            {user?.societyName && <strong>{user.societyName}</strong>}
            {" — "}
            Signed in as {user?.email} ({user?.role})
          </p>
        </div>
        <button type="button" onClick={() => logout()}>
          Log out
        </button>
      </header>
      <section>
        <p>
          Staff dashboard for {user?.role} role. Resident management, expenses,
          and reports will be added in later phases.
        </p>
      </section>
    </main>
  );
}
