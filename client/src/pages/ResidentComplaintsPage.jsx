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
import Input, { inputClassName, textareaClassName } from "../components/ui/Input";
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

function statusVariant(status) {
  if (status === "in_progress") return "warning";
  if (status === "resolved" || status === "closed") return "paid";
  if (status === "rejected") return "cancelled";
  return "pending";
}

function statusLabel(status) {
  return String(status).replaceAll("_", " ");
}

export default function ResidentComplaintsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    const data = await complaintsApi.listMyComplaints();
    setComplaints(data.complaints ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load complaints"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await complaintsApi.createComplaint({ category, title, description });
      setSuccess("Complaint submitted.");
      setShowForm(false);
      setCategory("other");
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
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
    >
      <div className="mb-4">
        <Link
          to={`/${societySlug}/resident`}
          className="text-sm font-medium text-brand-700 no-underline hover:underline"
        >
          ← Resident portal
        </Link>
      </div>

      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Raise an issue for your flat. Staff will update the status as they
            work on it.
          </p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} disabled={busy}>
              New complaint
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Raise a complaint
            </h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <FormField label="Category">
                <select
                  className={inputClassName}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  minLength={3}
                />
              </FormField>
              <FormField label="Description">
                <textarea
                  className={textareaClassName}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  required
                  minLength={5}
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Submit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Your complaints
          </h2>
          {complaints.length === 0 ? (
            <p className="text-sm text-slate-500">No complaints yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <li key={c.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <Badge variant={statusVariant(c.status)}>
                      {statusLabel(c.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {c.category} · {c.blockName}-{c.flatNumber} ·{" "}
                    {formatDisplayDate(c.createdAt?.slice?.(0, 10) ?? c.createdAt)}
                  </p>
                  <p className="text-sm text-slate-700">{c.description}</p>
                  {c.staffNotes && (
                    <p className="text-sm text-slate-600">
                      Staff note: {c.staffNotes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
