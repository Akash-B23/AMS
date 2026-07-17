import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

export default function StaffDashboard() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const canManageMasterData =
    user?.role === "manager" || user?.role === "admin";
  const canManageFinance =
    user?.role === "admin" || user?.role === "treasurer";

  return (
    <DashboardLayout
      title="Staff portal"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email} (${user?.role})`
          : `${user?.email} (${user?.role})`
      }
      onLogout={logout}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Staff dashboard for {user?.role}. Expenses and vendors will be
            added in later phases.
          </p>
        </Card>

        {canManageMasterData && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Complaints
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Review resident complaints and update status as work progresses.
            </p>
            <Link
              to={`/${societySlug}/staff/complaints`}
              className="mt-4 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-brand-800"
            >
              Open complaints
            </Link>
          </Card>
        )}

        {canManageFinance && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Pending dues
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Generate monthly invoices, view outstanding dues, verify resident
              transaction IDs, mark offline payments, and run reminder stubs.
            </p>
            <Link
              to={`/${societySlug}/staff/dues`}
              className="mt-4 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-brand-800"
            >
              Open dues
            </Link>
          </Card>
        )}

        {canManageMasterData && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">Master data</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bulk upload blocks, flats, maintenance amounts, and amenities.
            </p>
            <Link
              to={`/${societySlug}/staff/master-data`}
              className="mt-4 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-brand-800"
            >
              Open master data
            </Link>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
