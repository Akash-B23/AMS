import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

export default function ResidentDashboard() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();

  return (
    <DashboardLayout
      title="Resident portal"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email}`
          : user?.email
      }
      onLogout={logout}
    >
      <Card className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Welcome to your apartment portal. Complaints, maintenance payments, and
          notices will appear here in later phases.
        </p>
        <Link
          to={`/${societySlug}/resident/profile`}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 no-underline transition hover:border-brand-200 hover:bg-brand-50"
        >
          <div>
            <p className="font-medium text-slate-900">My profile</p>
            <p className="text-sm text-slate-600">
              Update contact details and vehicles
            </p>
          </div>
          <span className="text-brand-700" aria-hidden="true">
            →
          </span>
        </Link>
      </Card>
    </DashboardLayout>
  );
}
