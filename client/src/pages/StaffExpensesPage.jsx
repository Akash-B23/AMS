import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as expensesApi from "../api/expenses";
import * as quotationsApi from "../api/quotations";
import * as vendorsApi from "../api/vendors";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input, { inputClassName } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import {
  formatDisplayDate,
  formatPaiseAsRupees,
  rupeesToPaise,
} from "../utils/money";

const CATEGORIES = [
  "utilities",
  "repairs",
  "security",
  "housekeeping",
  "landscaping",
  "salaries",
  "supplies",
  "other",
];

function categoryLabel(category) {
  return String(category).replaceAll("_", " ");
}

const emptyForm = {
  category: "repairs",
  title: "",
  description: "",
  amountRupees: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  vendorId: "",
  quotationId: "",
};

export default function StaffExpensesPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [expenseData, vendorData, quotationData] = await Promise.all([
      expensesApi.listExpenses({
        category: categoryFilter || undefined,
      }),
      vendorsApi.listVendors({ activeOnly: true }),
      quotationsApi.listQuotations({ status: "approved" }),
    ]);
    setExpenses(expenseData.expenses ?? []);
    setVendors(vendorData.vendors ?? []);
    setQuotations(quotationData.quotations ?? []);
  }, [categoryFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load expenses"))
      .finally(() => setLoading(false));
  }, [load]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  }

  function buildPayload() {
    const amountPaise = rupeesToPaise(form.amountRupees);
    if (!amountPaise) {
      return { error: "Enter a valid amount greater than zero." };
    }
    if (!form.title.trim() || form.title.trim().length < 3) {
      return { error: "Title must be at least 3 characters." };
    }
    return {
      payload: {
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim() || null,
        amountPaise,
        expenseDate: form.expenseDate || undefined,
        vendorId: form.vendorId || null,
        quotationId: form.quotationId || null,
      },
    };
  }

  function handlePrepareConfirm(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const result = buildPayload();
    if (result.error) {
      setError(result.error);
      return;
    }
    setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setError(null);
    setSuccess(null);
    const result = buildPayload();
    if (result.error) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    setBusy(true);
    try {
      await expensesApi.createExpense(result.payload);
      setSuccess("Expense recorded.");
      setForm(emptyForm);
      setConfirming(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create expense");
    } finally {
      setBusy(false);
    }
  }

  const filteredQuotations = form.vendorId
    ? quotations.filter((q) => q.vendorId === form.vendorId)
    : quotations;

  if (loading && expenses.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Expenses"
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

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Record expense
          </h2>
          {!confirming ? (
            <form onSubmit={handlePrepareConfirm} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Category">
                  <select
                    className={inputClassName}
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {categoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Amount (₹)">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amountRupees}
                    onChange={(e) => updateField("amountRupees", e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Title">
                  <Input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    maxLength={200}
                    required
                  />
                </FormField>
                <FormField label="Expense date">
                  <Input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => updateField("expenseDate", e.target.value)}
                  />
                </FormField>
                <FormField label="Vendor (optional)">
                  <select
                    className={inputClassName}
                    value={form.vendorId}
                    onChange={(e) => {
                      updateField("vendorId", e.target.value);
                      updateField("quotationId", "");
                    }}
                  >
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Approved quotation (optional)">
                  <select
                    className={inputClassName}
                    value={form.quotationId}
                    onChange={(e) => updateField("quotationId", e.target.value)}
                  >
                    <option value="">None</option>
                    {filteredQuotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} · {formatPaiseAsRupees(q.amountPaise)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Description (optional)">
                <textarea
                  className={inputClassName}
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  maxLength={5000}
                />
              </FormField>
              <Button type="submit" disabled={busy}>
                Review expense
              </Button>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700">
                Confirm recording{" "}
                <span className="font-semibold">
                  {formatPaiseAsRupees(rupeesToPaise(form.amountRupees))}
                </span>{" "}
                under <span className="font-semibold">{form.title.trim()}</span>{" "}
                ({categoryLabel(form.category)}) on{" "}
                {formatDisplayDate(form.expenseDate)}.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleConfirmSubmit} disabled={busy}>
                  Confirm &amp; save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Society expense ledger.</p>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            Category
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </Card>

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Vendor</th>
                <th className="px-2 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-2 py-3 text-slate-700">
                    {formatDisplayDate(expense.expenseDate)}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant="pending">
                      {categoryLabel(expense.category)}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-slate-900">
                    <p className="font-medium">{expense.title}</p>
                    {expense.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                        {expense.description}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {expense.vendorName ?? "—"}
                  </td>
                  <td className="px-2 py-3 font-medium text-slate-900">
                    {formatPaiseAsRupees(expense.amountPaise)}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No expenses found.
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
