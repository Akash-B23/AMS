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
  if (displayStatus === "cancelled") return "cancelled";
  if (displayStatus === "awaiting_verification") return "warning";
  return "pending";
}

function statusLabel(displayStatus) {
  if (displayStatus === "awaiting_verification") return "awaiting verification";
  return displayStatus;
}

export default function ResidentDashboard() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [dues, setDues] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitId, setSubmitId] = useState(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [confirmRef, setConfirmRef] = useState("");
  const [busy, setBusy] = useState(false);

  const loadDues = useCallback(async () => {
    const data = await invoicesApi.getResidentDues();
    setDues(data);
  }, []);

  useEffect(() => {
    loadDues()
      .catch(() => setError("Failed to load dues"))
      .finally(() => setLoading(false));
  }, [loadDues]);

  function openSubmitForm(invoice) {
    setError(null);
    setInfo(null);
    setSubmitId(invoice.id);
    setTransactionRef("");
    setConfirmRef("");
  }

  async function handleSubmitPayment(e) {
    e.preventDefault();
    if (!submitId) return;

    const ref = transactionRef.trim();
    if (ref.length < 4) {
      setError("Enter a valid transaction / UTR ID");
      return;
    }
    if (ref !== confirmRef.trim()) {
      setError("Transaction ID and confirmation do not match");
      return;
    }

    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await invoicesApi.submitPayment(submitId, { transactionRef: ref });
      setInfo(
        "Transaction ID submitted. Your invoice will show as paid after society staff verifies it.",
      );
      setSubmitId(null);
      setTransactionRef("");
      setConfirmRef("");
      await loadDues();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit payment",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  const amountDue = dues?.amountDuePaise ?? 0;

  return (
    <DashboardLayout
      title="Resident portal"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email}`
          : user?.email
      }
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="resident"
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/${societySlug}/resident/reports`}
            className="inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-brand-800"
          >
            My reports
          </Link>
        </div>

        <Card className="space-y-2">
          <p className="text-sm font-medium text-slate-600">Amount due</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">
            {formatPaiseAsRupees(amountDue)}
          </p>
          <p className="text-sm text-slate-600">
            {amountDue > 0
              ? "Pay via your bank/UPI, then submit the transaction ID below for staff verification."
              : "You have no outstanding maintenance invoices."}
          </p>
        </Card>

        {submitId && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Submit transaction ID
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm the UTR / reference before submitting. Staff will verify
              it before marking the invoice paid.
            </p>
            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-3">
              <FormField label="Transaction / UTR ID">
                <Input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  maxLength={128}
                  autoComplete="off"
                  required
                />
              </FormField>
              <FormField label="Confirm transaction ID">
                <Input
                  value={confirmRef}
                  onChange={(e) => setConfirmRef(e.target.value)}
                  maxLength={128}
                  autoComplete="off"
                  required
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Confirm submit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSubmitId(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {dues?.unpaidInvoices?.length > 0 && (
          <Card className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              Unpaid invoices
            </h2>
            <ul className="divide-y divide-slate-100">
              {dues.unpaidInvoices.map((invoice) => {
                const awaiting =
                  invoice.displayStatus === "awaiting_verification";
                return (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatBillingPeriod(invoice.billingPeriod)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {invoice.blockName}-{invoice.flatNumber} · Due{" "}
                        {formatDisplayDate(invoice.dueDate)} ·{" "}
                        {formatPaiseAsRupees(invoice.amountPaise)}
                      </p>
                      {awaiting && invoice.transactionRef && (
                        <p className="mt-1 text-sm text-slate-600">
                          Submitted ref: {invoice.transactionRef}
                        </p>
                      )}
                      <div className="mt-1">
                        <Badge variant={statusVariant(invoice.displayStatus)}>
                          {statusLabel(invoice.displayStatus)}
                        </Badge>
                      </div>
                    </div>
                    {!awaiting && (
                      <Button
                        onClick={() => openSubmitForm(invoice)}
                        disabled={busy || submitId === invoice.id}
                      >
                        Submit payment
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {dues?.paidInvoices?.length > 0 && (
          <Card className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              Payment history
            </h2>
            <ul className="divide-y divide-slate-100">
              {dues.paidInvoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatBillingPeriod(invoice.billingPeriod)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatPaiseAsRupees(invoice.amountPaise)}
                    </p>
                  </div>
                  <Badge variant="paid">paid</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <Link
            to={`/${societySlug}/resident/complaints`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 no-underline transition hover:border-brand-200 hover:bg-brand-50"
          >
            <div>
              <p className="font-medium text-slate-900">Complaints</p>
              <p className="text-sm text-slate-600">
                Raise issues and track status updates
              </p>
            </div>
            <span className="text-brand-700" aria-hidden="true">
              →
            </span>
          </Link>
        </Card>

        <Card>
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
      </div>
    </DashboardLayout>
  );
}
