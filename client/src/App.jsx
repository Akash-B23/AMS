import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={["resident", "tenant"]} />
            }
          >
            <Route path="/resident" element={<ResidentDashboard />} />
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
            <Route path="/staff" element={<StaffDashboard />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
