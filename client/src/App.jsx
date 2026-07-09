import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  GuestRoute,
  PlatformProtectedRoute,
  ProtectedRoute,
} from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import PlatformDashboard from "./pages/PlatformDashboard";
import PlatformLoginPage from "./pages/PlatformLoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/greenview-apartments/login" replace />}
          />

          <Route element={<GuestRoute platform />}>
            <Route path="/platform/login" element={<PlatformLoginPage />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/:societySlug/login" element={<LoginPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={["resident", "tenant"]} />
            }
          >
            <Route path="/:societySlug/resident" element={<ResidentDashboard />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  "manager",
                  "admin",
                  "association_staff",
                  "treasurer",
                ]}
              />
            }
          >
            <Route path="/:societySlug/staff" element={<StaffDashboard />} />
          </Route>

          <Route
            element={
              <PlatformProtectedRoute allowedRoles={["platform_superadmin"]} />
            }
          >
            <Route path="/platform" element={<PlatformDashboard />} />
          </Route>

          <Route element={<ProtectedRoute requireSociety={false} />}>
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/greenview-apartments/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
