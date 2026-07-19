import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as reportsApi from "../api/reports";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { downloadCsv } from "../utils/csvExport";
import {
  formatBillingPeriod,
  formatDisplayDate,
  formatPaiseAsRupees,
} from "../utils/money";

function yearDefaults() {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export default function StaffReportsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const defaults = yearDefaults();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [maintenance, setMaintenance] = useState(null);

  const canFinance = user?.role === "admin" || user?.role === "treasurer";
  const canComplaints =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "association_staff";
  const canMaintenance =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "treasurer" ||
    user?.role === "association_staff";

  const load = useCallback(async () => {
    const tasks = [];
    if (canFinance) {
      tasks.push(
        reportsApi.getCollectionReport({ from, to }).then(setCollection),
        reportsApi.getExpenseReport({ from, to }).then(setExpenses),
      );
    }
    if (canComplaints) {
      tasks.push(
        reportsApi.getComplaintsReport({ from, to }).then(setComplaints),
      );
    }
    if (canMaintenance) {
      tasks.push(reportsApi.getMaintenanceReport().then(setMaintenance));
    }
    await Promise.all(tasks);
  }, [from, to, canFinance, canComplaints, canMaintenance]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load()
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading && !collection && !complaints && !maintenance) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Society reports"
      subtitle="On-demand summaries with CSV export"
      backTo={`/${societySlug}/staff`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="staff"
      wide
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="From">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </FormField>
            <FormField label="To">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </FormField>
          </div>
        </Card>

        {canFinance && collection && (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Collection
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Paid {formatPaiseAsRupees(collection.totals.paidAmountPaise)} ·
                  Pending{" "}
                  {formatPaiseAsRupees(collection.totals.pendingAmountPaise)} ·
                  Overdue{" "}
                  {formatPaiseAsRupees(collection.totals.overdueAmountPaise)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `collection-${from}-to-${to}.csv`,
                    ["billing_period", "status", "count", "amount_rupees"],
                    collection.rows.map((r) => [
                      r.billingPeriod,
                      r.status,
                      r.count,
                      (r.amountPaise / 100).toFixed(2),
                    ]),
                  )
                }
              >
                Download CSV
              </Button>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {collection.rows.slice(0, 12).map((r) => (
                <li key={`${r.billingPeriod}-${r.status}`}>
                  {formatBillingPeriod(r.billingPeriod)} · {r.status}: {r.count}{" "}
                  ({formatPaiseAsRupees(r.amountPaise)})
                </li>
              ))}
              {collection.rows.length === 0 && (
                <li className="text-slate-600">No invoices in range.</li>
              )}
            </ul>
          </Card>
        )}

        {canFinance && expenses && (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Expenses
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Total {formatPaiseAsRupees(expenses.totals.amountPaise)} (
                  {expenses.totals.count} entries)
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `expenses-${from}-to-${to}.csv`,
                    ["category", "count", "amount_rupees"],
                    expenses.rows.map((r) => [
                      r.category,
                      r.count,
                      (r.amountPaise / 100).toFixed(2),
                    ]),
                  )
                }
              >
                Download CSV
              </Button>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {expenses.rows.map((r) => (
                <li key={r.category}>
                  {r.category}: {r.count} ({formatPaiseAsRupees(r.amountPaise)})
                </li>
              ))}
              {expenses.rows.length === 0 && (
                <li className="text-slate-600">No expenses in range.</li>
              )}
            </ul>
          </Card>
        )}

        {canComplaints && complaints && (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Complaints
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Counts by status and category for the selected dates.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `complaints-${from}-to-${to}.csv`,
                    ["group", "key", "count"],
                    [
                      ...complaints.byStatus.map((r) => [
                        "status",
                        r.status,
                        r.count,
                      ]),
                      ...complaints.byCategory.map((r) => [
                        "category",
                        r.category,
                        r.count,
                      ]),
                    ],
                  )
                }
              >
                Download CSV
              </Button>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  By status
                </p>
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {complaints.byStatus.map((r) => (
                    <li key={r.status}>
                      {r.status}: {r.count}
                    </li>
                  ))}
                  {complaints.byStatus.length === 0 && (
                    <li className="text-slate-600">None</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  By category
                </p>
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {complaints.byCategory.map((r) => (
                    <li key={r.category}>
                      {r.category}: {r.count}
                    </li>
                  ))}
                  {complaints.byCategory.length === 0 && (
                    <li className="text-slate-600">None</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {canMaintenance && maintenance && (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Maintenance adherence
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Planned {maintenance.activityCounts.planned} · Overdue{" "}
                  {maintenance.activityCounts.overdue} · Completed{" "}
                  {maintenance.activityCounts.completed} · From schedules{" "}
                  {maintenance.activityCounts.fromSchedule}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    "maintenance-schedules.csv",
                    [
                      "title",
                      "category",
                      "frequency",
                      "is_active",
                      "next_due_date",
                      "last_generated_at",
                    ],
                    maintenance.schedules.map((s) => [
                      s.title,
                      s.category,
                      s.frequency,
                      s.isActive,
                      s.nextDueDate,
                      s.lastGeneratedAt ?? "",
                    ]),
                  )
                }
              >
                Download CSV
              </Button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {maintenance.schedules.map((s) => (
                <li key={s.id}>
                  {s.title} · {s.frequency} · next{" "}
                  {formatDisplayDate(s.nextDueDate)}
                  {!s.isActive ? " (paused)" : ""}
                </li>
              ))}
              {maintenance.schedules.length === 0 && (
                <li className="text-slate-600">No recurring schedules yet.</li>
              )}
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
