import { Navigate, Outlet, useParams } from "react-router-dom";
import LoadingScreen from "./layout/LoadingScreen";
import { useAuth } from "../context/AuthContext";

const STAFF_ROLES = [
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];

function societyLoginPath(societySlug) {
  return societySlug ? `/${societySlug}/login` : "/";
}

export function ProtectedRoute({ allowedRoles, requireSociety = true }) {
  const { societySlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
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
    return <LoadingScreen />;
  }

  if (user) {
    return (
      <Navigate
        to={homePathForRole(
          user.role,
          user.societySlug ?? societySlug,
          user.setupComplete,
        )}
        replace
      />
    );
  }

  return <Outlet />;
}

export function PlatformProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function SetupRoute() {
  const { societySlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to={societyLoginPath(societySlug)} replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.societySlug !== societySlug) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.setupComplete) {
    return <Navigate to={`/${societySlug}/staff`} replace />;
  }

  return <Outlet />;
}

export function StaffRoute() {
  const { societySlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to={societyLoginPath(societySlug)} replace />;
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.societySlug !== societySlug) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.role === "admin" && user.setupComplete === false) {
    return <Navigate to={`/${societySlug}/setup`} replace />;
  }

  return <Outlet />;
}
