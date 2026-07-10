import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

export default function PlatformDashboard() {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      title="Platform admin"
      subtitle={`Signed in as ${user?.email} (${user?.role})`}
      onLogout={logout}
      wide
    >
      <Card>
        <p className="text-sm leading-relaxed text-slate-600">
          Platform superadmin portal. Society management and cross-tenant support
          tools will be added in later phases.
        </p>
      </Card>
    </DashboardLayout>
  );
}
