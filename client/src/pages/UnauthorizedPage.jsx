import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UnauthorizedPage() {
  const { user, homePathForRole } = useAuth();

  return (
    <main className="auth-page">
      <h1>Access denied</h1>
      <p>Your role ({user?.role}) cannot view this page.</p>
      {user && (
        <Link to={homePathForRole(user.role)}>Go to your dashboard</Link>
      )}
    </main>
  );
}
