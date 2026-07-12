import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as invoicesApi from "../api/invoices";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export default function PaymentsSettingsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [vendorId, setVendorId] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoicesApi
      .getPaymentsSettings()
      .then((data) => {
        setVendorId(data.society.cashfreeVendorId ?? "");
      })
      .catch(() => setError("Failed to load payment settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await invoicesApi.updatePaymentsSettings({
        cashfreeVendorId: vendorId.trim() || null,
      });
      setVendorId(data.society.cashfreeVendorId ?? "");
      setSuccess("Payment settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Payment settings"
      subtitle={
        user?.societyName
          ? `${user.societyName} · Cashfree vendor`
          : "Cashfree vendor"
      }
      onLogout={logout}
    >
      <div className="mb-4">
        <Link
          to={`/${societySlug}/staff`}
          className="text-sm font-medium text-brand-700 no-underline hover:underline"
        >
          ← Staff portal
        </Link>
      </div>

      <Card className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <p className="text-sm text-slate-600">
          Maintenance payments are split to this society&apos;s Cashfree vendor
          (Easy Split). Residents cannot pay online until this is set and
          Cashfree keys are configured on the server.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Cashfree vendor ID">
            <Input
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="vendor_…"
              maxLength={64}
            />
          </FormField>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
