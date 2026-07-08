import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading, homePathForRole } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
