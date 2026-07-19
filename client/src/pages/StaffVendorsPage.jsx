import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
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

function statusVariant(status) {
  if (status === "approved") return "paid";
  if (status === "rejected") return "cancelled";
  return "pending";
}

const emptyVendor = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  notes: "",
};

const emptyQuotation = {
  vendorId: "",
  title: "",
  description: "",
  amountRupees: "",
};

export default function StaffVendorsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [quotationForm, setQuotationForm] = useState(emptyQuotation);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [vendorData, quotationData] = await Promise.all([
      vendorsApi.listVendors(),
      quotationsApi.listQuotations({
        status: statusFilter || undefined,
      }),
    ]);
    setVendors(vendorData.vendors ?? []);
    setQuotations(quotationData.quotations ?? []);
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load vendors and quotations"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCreateVendor(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await vendorsApi.createVendor({
        name: vendorForm.name.trim(),
        contactName: vendorForm.contactName.trim() || null,
        phone: vendorForm.phone.trim() || null,
        email: vendorForm.email.trim() || null,
        notes: vendorForm.notes.trim() || null,
      });
      setSuccess("Vendor added.");
      setVendorForm(emptyVendor);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add vendor");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(vendor) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await vendorsApi.updateVendor(vendor.id, { isActive: !vendor.isActive });
      setSuccess(
        vendor.isActive ? "Vendor deactivated." : "Vendor reactivated.",
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateQuotation(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amountPaise = rupeesToPaise(quotationForm.amountRupees);
    if (!amountPaise) {
      setError("Enter a valid quotation amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      await quotationsApi.createQuotation({
        vendorId: quotationForm.vendorId,
        title: quotationForm.title.trim(),
        description: quotationForm.description.trim() || null,
        amountPaise,
      });
      setSuccess("Quotation submitted.");
      setQuotationForm(emptyQuotation);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit quotation",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(id) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await quotationsApi.approveQuotation(id);
      setSuccess("Quotation approved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectId) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await quotationsApi.rejectQuotation(rejectId, {
        rejectionReason: rejectReason.trim(),
      });
      setSuccess("Quotation rejected.");
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  const activeVendors = vendors.filter((v) => v.isActive);

  if (loading && vendors.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Vendors & quotations"
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
          <h2 className="text-base font-semibold text-slate-900">Add vendor</h2>
          <form onSubmit={handleCreateVendor} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Name">
                <Input
                  value={vendorForm.name}
                  onChange={(e) =>
                    setVendorForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  maxLength={200}
                />
              </FormField>
              <FormField label="Contact name">
                <Input
                  value={vendorForm.contactName}
                  onChange={(e) =>
                    setVendorForm((p) => ({
                      ...p,
                      contactName: e.target.value,
                    }))
                  }
                  maxLength={200}
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={vendorForm.phone}
                  onChange={(e) =>
                    setVendorForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  maxLength={20}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) =>
                    setVendorForm((p) => ({ ...p, email: e.target.value }))
                  }
                  maxLength={255}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea
                className={inputClassName}
                rows={2}
                value={vendorForm.notes}
                onChange={(e) =>
                  setVendorForm((p) => ({ ...p, notes: e.target.value }))
                }
                maxLength={5000}
              />
            </FormField>
            <Button type="submit" disabled={busy}>
              Save vendor
            </Button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Vendors
          </h2>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Contact</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="px-2 py-3 text-slate-900">
                    <p className="font-medium">{vendor.name}</p>
                    {vendor.notes && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                        {vendor.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    <p>{vendor.contactName ?? "—"}</p>
                    <p className="text-xs text-slate-500">
                      {[vendor.phone, vendor.email].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={vendor.isActive ? "paid" : "cancelled"}>
                      {vendor.isActive ? "active" : "inactive"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => handleToggleActive(vendor)}
                      disabled={busy}
                    >
                      {vendor.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No vendors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Submit quotation
          </h2>
          <form onSubmit={handleCreateQuotation} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Vendor">
                <select
                  className={inputClassName}
                  value={quotationForm.vendorId}
                  onChange={(e) =>
                    setQuotationForm((p) => ({
                      ...p,
                      vendorId: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select vendor</option>
                  {activeVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amount (₹)">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quotationForm.amountRupees}
                  onChange={(e) =>
                    setQuotationForm((p) => ({
                      ...p,
                      amountRupees: e.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Title">
                <Input
                  value={quotationForm.title}
                  onChange={(e) =>
                    setQuotationForm((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                  maxLength={200}
                />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea
                className={inputClassName}
                rows={2}
                value={quotationForm.description}
                onChange={(e) =>
                  setQuotationForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                maxLength={5000}
              />
            </FormField>
            <Button type="submit" disabled={busy || activeVendors.length === 0}>
              Submit quotation
            </Button>
          </form>
        </Card>

        {rejectId && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Reject quotation
            </h2>
            <form onSubmit={handleReject} className="mt-4 space-y-3">
              <FormField label="Rejection reason">
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  minLength={3}
                  maxLength={2000}
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Confirm reject
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRejectId(null);
                    setRejectReason("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Review vendor quotations and approve or reject.
          </p>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            Status
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
        </Card>

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Vendor</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Submitted</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="px-2 py-3 text-slate-900">{q.vendorName}</td>
                  <td className="px-2 py-3 text-slate-900">
                    <p className="font-medium">{q.title}</p>
                    {q.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                        {q.description}
                      </p>
                    )}
                    {q.rejectionReason && (
                      <p className="mt-0.5 text-xs text-rose-600">
                        Reason: {q.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 font-medium text-slate-900">
                    {formatPaiseAsRupees(q.amountPaise)}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {formatDisplayDate(
                      typeof q.createdAt === "string"
                        ? q.createdAt.slice(0, 10)
                        : q.createdAt,
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                  </td>
                  <td className="px-2 py-3">
                    {q.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="px-3 py-1.5 text-xs"
                          onClick={() => handleApprove(q.id)}
                          disabled={busy}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => {
                            setRejectId(q.id);
                            setRejectReason("");
                            setError(null);
                            setSuccess(null);
                          }}
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {quotations.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No quotations found.
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
