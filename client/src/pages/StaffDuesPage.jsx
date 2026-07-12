import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as invoicesApi from "../api/invoices";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import {
  formatBillingPeriod,
  formatDisplayDate,
  formatPaiseAsRupees,
} from "../utils/money";

function statusVariant(displayStatus) {
  if (displayStatus === "overdue") return "overdue";
  if (displayStatus === "paid") return "paid";
  return "pending";
}

export default function StaffDuesPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [dues, setDues] = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [markPaidId, setMarkPaidId] = useState(null);
  const [markMethod, setMarkMethod] = useState("cash");
  const [markNotes, setMarkNotes] = useState("");

  const loadDues = useCallback(async () => {
    const data = await invoicesApi.getPendingDues({ overdueOnly });
    setDues(data);
  }, [overdueOnly]);

  useEffect(() => {
    setLoading(true);
    loadDues()
      .catch(() => setError("Failed to load pending dues"))
      .finally(() => setLoading(false));
  }, [loadDues]);

  async function handleGenerate() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await invoicesApi.generateInvoices();
      const s = result.summary;
      setSuccess(
        `Generated for ${formatBillingPeriod(s.billingPeriod)}: ${s.created} created, ${s.skippedExisting} already existed, ${s.skippedNoAmount} missing amount, ${s.skippedNoResident} no resident.`,
      );
      await loadDues();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReminders() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await invoicesApi.runReminders();
      setSuccess(
        `Reminders recorded: ${result.recorded} (skipped ${result.skipped}). No email was sent — stubs only.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reminders failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkPaid(e) {
    e.preventDefault();
    if (!markPaidId) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await invoicesApi.markInvoicePaid(markPaidId, {
        method: markMethod,
        notes: markNotes || null,
      });
      setSuccess("Invoice marked paid.");
      setMarkPaidId(null);
      setMarkNotes("");
      await loadDues();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mark paid failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !dues) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Pending dues"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email}`
          : user?.email
      }
      onLogout={logout}
      wide
    >
      <div className="mb-4">
        <Link
          to={`/${societySlug}/staff`}
          className="text-sm font-medium text-brand-700 no-underline hover:underline"
        >
          ← Staff portal
        </Link>
      </div>

      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">Outstanding</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatPaiseAsRupees(dues?.totals?.amountPaise ?? 0)}
            </p>
            <p className="text-sm text-slate-600">
              {dues?.totals?.count ?? 0} invoice
              {(dues?.totals?.count ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Overdue only
            </label>
            <Button onClick={handleGenerate} disabled={busy}>
              Generate this month
            </Button>
            <Button variant="secondary" onClick={handleReminders} disabled={busy}>
              Run reminders
            </Button>
          </div>
        </Card>

        {markPaidId && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Mark invoice paid
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm offline payment before submitting.
            </p>
            <form onSubmit={handleMarkPaid} className="mt-4 space-y-3">
              <FormField label="Method">
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={markMethod}
                  onChange={(e) => setMarkMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi_offline">UPI (offline)</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
              <FormField label="Notes (optional)">
                <Input
                  value={markNotes}
                  onChange={(e) => setMarkNotes(e.target.value)}
                  maxLength={500}
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Confirm mark paid
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMarkPaidId(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Flat</th>
                <th className="px-2 py-2 font-medium">Resident</th>
                <th className="px-2 py-2 font-medium">Period</th>
                <th className="px-2 py-2 font-medium">Due</th>
                <th className="px-2 py-2 font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(dues?.invoices ?? []).map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-2 py-3 text-slate-900">
                    {invoice.blockName}-{invoice.flatNumber}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {invoice.residentName}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {formatBillingPeriod(invoice.billingPeriod)}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {formatDisplayDate(invoice.dueDate)}
                  </td>
                  <td className="px-2 py-3 font-medium text-slate-900">
                    {formatPaiseAsRupees(invoice.amountPaise)}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={statusVariant(invoice.displayStatus)}>
                      {invoice.displayStatus}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setMarkPaidId(invoice.id)}
                      disabled={busy}
                    >
                      Mark paid
                    </Button>
                  </td>
                </tr>
              ))}
              {(dues?.invoices ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No pending invoices. Generate this month to create them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
