import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function societyLoginPath(societySlug) {
  return societySlug ? `/${societySlug}/login` : "/";
}

export function ProtectedRoute({ allowedRoles, requireSociety = true }) {
  const { societySlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    if (societySlug) {
      return <Navigate to={societyLoginPath(societySlug)} replace />;
    }
    return <Navigate to="/platform/login" replace />;
  }

  if (
    requireSociety &&
    societySlug &&
    user.societySlug &&
    user.societySlug !== societySlug
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function GuestRoute({ platform = false }) {
  const { societySlug } = useParams();
  const { user, loading, homePathForRole } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (user) {
    return (
      <Navigate
        to={homePathForRole(user.role, user.societySlug ?? societySlug)}
        replace
      />
    );
  }

  return <Outlet />;
}

export function PlatformProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
