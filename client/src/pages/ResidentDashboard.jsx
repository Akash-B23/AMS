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
import { useAuth } from "../context/AuthContext";
import {
  formatBillingPeriod,
  formatDisplayDate,
  formatPaiseAsRupees,
} from "../utils/money";
import { openCashfreeCheckout } from "../utils/cashfreeCheckout";

function statusVariant(displayStatus) {
  if (displayStatus === "overdue") return "overdue";
  if (displayStatus === "paid") return "paid";
  if (displayStatus === "cancelled") return "cancelled";
  return "pending";
}

export default function ResidentDashboard() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [dues, setDues] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  const loadDues = useCallback(async () => {
    const data = await invoicesApi.getResidentDues();
    setDues(data);
  }, []);

  useEffect(() => {
    loadDues()
      .catch(() => setError("Failed to load dues"))
      .finally(() => setLoading(false));
  }, [loadDues]);

  async function handlePay(invoice) {
    setError(null);
    setInfo(null);
    setPayingId(invoice.id);
    try {
      const order = await invoicesApi.createPaymentOrder(invoice.id);
      await openCashfreeCheckout({
        paymentSessionId: order.paymentSessionId,
        environment: order.environment,
      });
      setInfo(
        "Payment submitted. Your invoice will show as paid after the bank confirms it (usually within a minute).",
      );
      await loadDues();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed to start");
    } finally {
      setPayingId(null);
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
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}

        <Card className="space-y-2">
          <p className="text-sm font-medium text-slate-600">Amount due</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">
            {formatPaiseAsRupees(amountDue)}
          </p>
          <p className="text-sm text-slate-600">
            {amountDue > 0
              ? "Pay outstanding maintenance below. Status updates after payment confirmation."
              : "You have no outstanding maintenance invoices."}
          </p>
        </Card>

        {dues?.unpaidInvoices?.length > 0 && (
          <Card className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              Unpaid invoices
            </h2>
            <ul className="divide-y divide-slate-100">
              {dues.unpaidInvoices.map((invoice) => (
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
                    <div className="mt-1">
                      <Badge variant={statusVariant(invoice.displayStatus)}>
                        {invoice.displayStatus}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePay(invoice)}
                    disabled={payingId === invoice.id}
                  >
                    {payingId === invoice.id ? "Opening…" : "Pay"}
                  </Button>
                </li>
              ))}
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
