import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as complaintsApi from "../api/complaints";
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

const STATUSES = ["open", "in_progress", "resolved", "closed", "rejected"];

function statusVariant(status) {
  if (status === "in_progress") return "warning";
  if (status === "resolved" || status === "closed") return "paid";
  if (status === "rejected") return "cancelled";
  return "pending";
}

function statusLabel(status) {
  return String(status).replaceAll("_", " ");
}

export default function StaffComplaintsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("open");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    const data = await complaintsApi.listSocietyComplaints({
      status: statusFilter || undefined,
    });
    setComplaints(data.complaints ?? []);
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load complaints"))
      .finally(() => setLoading(false));
  }, [load]);

  function openEdit(complaint) {
    setEditingId(complaint.id);
    setEditStatus(complaint.status);
    setEditNotes(complaint.staffNotes ?? "");
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
      await complaintsApi.updateComplaint(editingId, {
        status: editStatus,
        staffNotes: editNotes.trim() || null,
      });
      setSuccess("Complaint updated.");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && complaints.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Complaints"
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

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Review resident complaints and update status.
          </p>
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
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </Card>

        {editingId && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Update complaint
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
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Staff notes (optional)">
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  maxLength={2000}
                />
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

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Flat</th>
                <th className="px-2 py-2 font-medium">Resident</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Opened</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td className="px-2 py-3 text-slate-900">
                    {c.blockName}-{c.flatNumber}
                  </td>
                  <td className="px-2 py-3 text-slate-700">{c.residentName}</td>
                  <td className="px-2 py-3 text-slate-700">{c.category}</td>
                  <td className="px-2 py-3 text-slate-900">
                    <p className="font-medium">{c.title}</p>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                      {c.description}
                    </p>
                    {c.staffNotes && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Note: {c.staffNotes}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {formatDisplayDate(
                      typeof c.createdAt === "string"
                        ? c.createdAt.slice(0, 10)
                        : c.createdAt,
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={statusVariant(c.status)}>
                      {statusLabel(c.status)}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => openEdit(c)}
                      disabled={busy}
                    >
                      Update
                    </Button>
                  </td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    No complaints found.
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
