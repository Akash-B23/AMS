import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  formatBillingPeriod,
  formatDisplayDate,
  formatPaiseAsRupees,
} from "../utils/money";

function currentMonthYm() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRangeFromYm(ym) {
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buildPendingDuesText(societyName, report) {
  const lines = [
    societyName || "Society",
    `Pending dues — ${formatBillingPeriod(`${report.billingPeriod}-01`)}`,
    "",
    `Total pending: ${report.totals.pendingCount} · ${formatPaiseAsRupees(report.totals.pendingAmountPaise)}`,
    `Overdue: ${report.totals.overdueCount} · ${formatPaiseAsRupees(report.totals.overdueAmountPaise)}`,
    "",
  ];
  for (const row of report.rows) {
    const overdue = row.isOverdue ? " (overdue)" : "";
    lines.push(
      `${row.blockName}-${row.flatNumber} · ${row.residentName} · ${formatPaiseAsRupees(row.amountPaise)} · due ${formatDisplayDate(row.dueDate)}${overdue}`,
    );
  }
  if (report.rows.length === 0) {
    lines.push("No pending dues for this period.");
  }
  return lines.join("\n");
}

function buildIncomeExpenseText(societyName, report) {
  const lines = [
    societyName || "Society",
    `Income & expense — ${formatDisplayDate(report.from)} to ${formatDisplayDate(report.to)}`,
    "",
    `Income (collections): ${formatPaiseAsRupees(report.income.amountPaise)} (${report.income.paidCount} payments)`,
    `Expenses: ${formatPaiseAsRupees(report.expenses.totals.amountPaise)} (${report.expenses.totals.count} entries)`,
    `Net: ${formatPaiseAsRupees(report.netPaise)}`,
    "",
  ];
  if (report.expenses.byCategory.length > 0) {
    lines.push("Expenses by category:");
    for (const row of report.expenses.byCategory) {
      lines.push(
        `· ${row.category}: ${formatPaiseAsRupees(row.amountPaise)} (${row.count})`,
      );
    }
  }
  return lines.join("\n");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

async function downloadCardPng(node, filename) {
  if (!node) return;
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export default function StaffShareableReportsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState(currentMonthYm);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDues, setPendingDues] = useState(null);
  const [incomeExpense, setIncomeExpense] = useState(null);

  const pendingCardRef = useRef(null);
  const incomeCardRef = useRef(null);

  const load = useCallback(async () => {
    const range = monthRangeFromYm(period);
    const [dues, income] = await Promise.all([
      reportsApi.getPendingDuesReport({ billingPeriod: period }),
      reportsApi.getIncomeExpenseReport(range),
    ]);
    setPendingDues(dues);
    setIncomeExpense(income);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load()
      .catch(() => setError("Failed to load shareable reports"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCopyPending() {
    if (!pendingDues) return;
    setBusy(true);
    setInfo(null);
    try {
      await copyText(buildPendingDuesText(user?.societyName, pendingDues));
      setInfo("Pending dues summary copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyIncome() {
    if (!incomeExpense) return;
    setBusy(true);
    setInfo(null);
    try {
      await copyText(
        buildIncomeExpenseText(user?.societyName, incomeExpense),
      );
      setInfo("Income/expense summary copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPending() {
    setBusy(true);
    setInfo(null);
    try {
      await downloadCardPng(
        pendingCardRef.current,
        `pending-dues-${period}.png`,
      );
      setInfo("Pending dues image downloaded.");
    } catch {
      setError("Could not download image");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadIncome() {
    setBusy(true);
    setInfo(null);
    try {
      await downloadCardPng(
        incomeCardRef.current,
        `income-expense-${period}.png`,
      );
      setInfo("Income/expense image downloaded.");
    } catch {
      setError("Could not download image");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !pendingDues) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Shareable summaries"
      subtitle="Copy text or download an image to paste into your group chat"
      backTo={`/${societySlug}/staff`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="staff"
      wide
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}

        <Card>
          <FormField label="Billing month">
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </FormField>
        </Card>

        {pendingDues && (
          <Card>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={handleCopyPending}>
                Copy text
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={handleDownloadPending}
              >
                Download image
              </Button>
            </div>
            <div
              ref={pendingCardRef}
              className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                AMS
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {user?.societyName || "Society"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pending dues ·{" "}
                {formatBillingPeriod(`${pendingDues.billingPeriod}-01`)}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="text-sm">
                  <span className="text-slate-500">Pending</span>
                  <br />
                  <span className="font-semibold">
                    {pendingDues.totals.pendingCount} ·{" "}
                    {formatPaiseAsRupees(pendingDues.totals.pendingAmountPaise)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Overdue</span>
                  <br />
                  <span className="font-semibold">
                    {pendingDues.totals.overdueCount} ·{" "}
                    {formatPaiseAsRupees(pendingDues.totals.overdueAmountPaise)}
                  </span>
                </p>
              </div>
              {pendingDues.rows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No pending dues for this period.
                </p>
              ) : (
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2 font-medium">Flat</th>
                      <th className="py-2 pr-2 font-medium">Resident</th>
                      <th className="py-2 pr-2 font-medium">Amount</th>
                      <th className="py-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDues.rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2">
                          {row.blockName}-{row.flatNumber}
                        </td>
                        <td className="py-2 pr-2">{row.residentName}</td>
                        <td className="py-2 pr-2">
                          {formatPaiseAsRupees(row.amountPaise)}
                        </td>
                        <td className="py-2">
                          {formatDisplayDate(row.dueDate)}
                          {row.isOverdue ? " · overdue" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {incomeExpense && (
          <Card>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={handleCopyIncome}>
                Copy text
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={handleDownloadIncome}
              >
                Download image
              </Button>
            </div>
            <div
              ref={incomeCardRef}
              className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                AMS
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {user?.societyName || "Society"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Income & expense · {formatDisplayDate(incomeExpense.from)} –{" "}
                {formatDisplayDate(incomeExpense.to)}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <p className="text-sm">
                  <span className="text-slate-500">Income</span>
                  <br />
                  <span className="font-semibold">
                    {formatPaiseAsRupees(incomeExpense.income.amountPaise)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Expenses</span>
                  <br />
                  <span className="font-semibold">
                    {formatPaiseAsRupees(
                      incomeExpense.expenses.totals.amountPaise,
                    )}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Net</span>
                  <br />
                  <span className="font-semibold">
                    {formatPaiseAsRupees(incomeExpense.netPaise)}
                  </span>
                </p>
              </div>
              {incomeExpense.expenses.byCategory.length > 0 && (
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2 font-medium">Category</th>
                      <th className="py-2 pr-2 font-medium">Count</th>
                      <th className="py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeExpense.expenses.byCategory.map((row) => (
                      <tr
                        key={row.category}
                        className="border-b border-slate-100"
                      >
                        <td className="py-2 pr-2">{row.category}</td>
                        <td className="py-2 pr-2">{row.count}</td>
                        <td className="py-2">
                          {formatPaiseAsRupees(row.amountPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
