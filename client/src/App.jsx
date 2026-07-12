import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  GuestRoute,
  PlatformProtectedRoute,
  ProtectedRoute,
  SetupRoute,
  StaffRoute,
} from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import MasterDataPage from "./pages/MasterDataPage";
import PaymentsSettingsPage from "./pages/PaymentsSettingsPage";
import PlatformDashboard from "./pages/PlatformDashboard";
import PlatformLoginPage from "./pages/PlatformLoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";
import ResidentProfilePage from "./pages/ResidentProfilePage";
import SignupPage from "./pages/SignupPage";
import SetupWizardPage from "./pages/SetupWizardPage";
import StaffDashboard from "./pages/StaffDashboard";
import StaffDuesPage from "./pages/StaffDuesPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute platform />}>
            <Route path="/platform/login" element={<PlatformLoginPage />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/:societySlug/login" element={<LoginPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={["resident", "tenant"]} />
            }
          >
            <Route path="/:societySlug/resident" element={<ResidentDashboard />} />
            <Route path="/:societySlug/resident/profile" element={<ResidentProfilePage />} />
          </Route>

          <Route element={<SetupRoute />}>
            <Route path="/:societySlug/setup" element={<SetupWizardPage />} />
          </Route>

          <Route element={<StaffRoute />}>
            <Route path="/:societySlug/staff" element={<StaffDashboard />} />
            <Route path="/:societySlug/staff/master-data" element={<MasterDataPage />} />
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "treasurer"]} />
              }
            >
              <Route path="/:societySlug/staff/dues" element={<StaffDuesPage />} />
              <Route
                path="/:societySlug/staff/payments-settings"
                element={<PaymentsSettingsPage />}
              />
            </Route>
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
