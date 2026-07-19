import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as activitiesApi from "../api/maintenanceActivities";
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
import { formatDisplayDate } from "../utils/money";

const CATEGORIES = [
  "plumbing",
  "electrical",
  "civil",
  "security",
  "housekeeping",
  "lift",
  "parking",
  "noise",
  "other",
];

const STATUSES = ["planned", "in_progress", "completed", "cancelled"];

function statusVariant(status) {
  if (status === "in_progress") return "warning";
  if (status === "completed") return "paid";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function label(value) {
  return String(value).replaceAll("_", " ");
}

const emptyForm = {
  category: "other",
  title: "",
  description: "",
  status: "planned",
  activityDate: new Date().toISOString().slice(0, 10),
  vendorId: "",
};

export default function StaffMaintenanceActivitiesPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const canManageVendors =
    user?.role === "admin" || user?.role === "treasurer";
  const [activities, setActivities] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("planned");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const activityData = await activitiesApi.listMaintenanceActivities({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    });
    setActivities(activityData.activities ?? []);

    if (canManageVendors) {
      const vendorData = await vendorsApi.listVendors({ activeOnly: true });
      setVendors(vendorData.vendors ?? []);
    }
  }, [statusFilter, categoryFilter, canManageVendors]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load maintenance activities"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await activitiesApi.createMaintenanceActivity({
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        activityDate: form.activityDate || undefined,
        vendorId: form.vendorId || null,
      });
      setSuccess("Maintenance activity logged.");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(activity) {
    setEditingId(activity.id);
    setEditStatus(activity.status);
    setError(null);
    setSuccess(null);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await activitiesApi.updateMaintenanceActivity(editingId, {
        status: editStatus,
      });
      setSuccess("Activity updated.");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && activities.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Maintenance activities"
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
            Log activity
          </h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category">
                <select
                  className={inputClassName}
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {label(c)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  className={inputClassName}
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  {STATUSES.filter((s) => s !== "cancelled").map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Title">
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                  maxLength={200}
                />
              </FormField>
              <FormField label="Activity date">
                <Input
                  type="date"
                  value={form.activityDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, activityDate: e.target.value }))
                  }
                />
              </FormField>
              {canManageVendors && (
                <FormField label="Vendor (optional)">
                  <select
                    className={inputClassName}
                    value={form.vendorId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, vendorId: e.target.value }))
                    }
                  >
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
            <FormField label="Description">
              <textarea
                className={inputClassName}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                maxLength={5000}
              />
            </FormField>
            <Button type="submit" disabled={busy}>
              Save activity
            </Button>
          </form>
        </Card>

        {editingId && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Update status
            </h2>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3">
              <FormField label="Status">
                <select
                  className={inputClassName}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingId(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Categorized maintenance work log for the society.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              Status
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
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
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Vendor</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-2 py-3 text-slate-700">
                    {formatDisplayDate(activity.activityDate)}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {label(activity.category)}
                  </td>
                  <td className="px-2 py-3 text-slate-900">
                    <p className="font-medium">{activity.title}</p>
                    {activity.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                        {activity.description}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {activity.vendorName ?? "—"}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={statusVariant(activity.status)}>
                      {label(activity.status)}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => openEdit(activity)}
                      disabled={busy || activity.status === "cancelled"}
                    >
                      Update
                    </Button>
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No maintenance activities found.
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
