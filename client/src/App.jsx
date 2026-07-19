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
import PlatformDashboard from "./pages/PlatformDashboard";
import PlatformLoginPage from "./pages/PlatformLoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";
import ResidentComplaintsPage from "./pages/ResidentComplaintsPage";
import ResidentProfilePage from "./pages/ResidentProfilePage";
import SignupPage from "./pages/SignupPage";
import SetupWizardPage from "./pages/SetupWizardPage";
import StaffDashboard from "./pages/StaffDashboard";
import StaffComplaintsPage from "./pages/StaffComplaintsPage";
import StaffDuesPage from "./pages/StaffDuesPage";
import StaffExpensesPage from "./pages/StaffExpensesPage";
import StaffMaintenanceActivitiesPage from "./pages/StaffMaintenanceActivitiesPage";
import StaffVendorsPage from "./pages/StaffVendorsPage";
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
            <Route path="/:societySlug/resident/complaints" element={<ResidentComplaintsPage />} />
          </Route>

          <Route element={<SetupRoute />}>
            <Route path="/:societySlug/setup" element={<SetupWizardPage />} />
          </Route>

          <Route element={<StaffRoute />}>
            <Route path="/:societySlug/staff" element={<StaffDashboard />} />
            <Route path="/:societySlug/staff/master-data" element={<MasterDataPage />} />
            <Route
              element={
                <ProtectedRoute allowedRoles={["manager", "admin"]} />
              }
            >
              <Route path="/:societySlug/staff/complaints" element={<StaffComplaintsPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "treasurer"]} />
              }
            >
              <Route path="/:societySlug/staff/dues" element={<StaffDuesPage />} />
              <Route path="/:societySlug/staff/expenses" element={<StaffExpensesPage />} />
              <Route path="/:societySlug/staff/vendors" element={<StaffVendorsPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["manager", "admin", "treasurer"]}
                />
              }
            >
              <Route
                path="/:societySlug/staff/maintenance-activities"
                element={<StaffMaintenanceActivitiesPage />}
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
