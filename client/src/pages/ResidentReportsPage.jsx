import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as reportsApi from "../api/reports";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
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

export default function ResidentReportsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const defaults = yearDefaults();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [summaryData, invoiceData] = await Promise.all([
      reportsApi.getResidentSummary(),
      reportsApi.getResidentInvoices({ from, to }),
    ]);
    setSummary(summaryData);
    setInvoices(invoiceData.invoices ?? []);
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [load]);

  function handleDownloadCsv() {
    downloadCsv(
      `my-invoices-${from}-to-${to}.csv`,
      [
        "billing_period",
        "due_date",
        "amount_rupees",
        "status",
        "paid_at",
        "payment_method",
        "transaction_ref",
      ],
      invoices.map((inv) => [
        inv.billingPeriod,
        inv.dueDate,
        (inv.amountPaise / 100).toFixed(2),
        inv.status,
        inv.paidAt ?? "",
        inv.paymentMethod ?? "",
        inv.transactionRef ?? "",
      ]),
    );
  }

  if (loading && !summary) return <LoadingScreen />;

  return (
    <DashboardLayout
      title="My reports"
      subtitle="Summary of your dues, complaints, and upcoming maintenance"
      backTo={`/${societySlug}/resident`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="resident"
      wide
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-600">Paid this year</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatPaiseAsRupees(summary?.invoiceSummary?.paidYtdPaise ?? 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Pending invoices</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary?.invoiceSummary?.pendingCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatPaiseAsRupees(
                summary?.invoiceSummary?.pendingAmountPaise ?? 0,
              )}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Complaints by status</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {(summary?.complaintsByStatus ?? []).length === 0 && (
                <li>None yet</li>
              )}
              {(summary?.complaintsByStatus ?? []).map((row) => (
                <li key={row.status}>
                  {row.status}: {row.count}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Upcoming society maintenance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Planned common-area work in the next 30 days.
          </p>
          <ul className="mt-3 space-y-2">
            {(summary?.upcomingMaintenance ?? []).length === 0 && (
              <li className="text-sm text-slate-600">Nothing scheduled.</li>
            )}
            {(summary?.upcomingMaintenance ?? []).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {a.category} · {formatDisplayDate(a.activityDate)}
                  </p>
                </div>
                <Badge variant="pending">{a.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Invoice history
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Filter by billing period and download CSV.
              </p>
            </div>
            <Button variant="secondary" onClick={handleDownloadCsv}>
              Download CSV
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium">Due</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      {formatBillingPeriod(inv.billingPeriod)}
                    </td>
                    <td className="py-2 pr-3">
                      {formatDisplayDate(inv.dueDate)}
                    </td>
                    <td className="py-2 pr-3">
                      {formatPaiseAsRupees(inv.amountPaise)}
                    </td>
                    <td className="py-2">{inv.status}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-600">
                      No invoices in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
