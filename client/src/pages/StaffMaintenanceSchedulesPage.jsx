import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as schedulesApi from "../api/maintenanceSchedules";
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

const FREQUENCIES = ["weekly", "monthly", "quarterly"];

const emptyForm = {
  title: "",
  description: "",
  category: "other",
  vendorId: "",
  frequency: "monthly",
  dayOfWeek: 1,
  dayOfMonth: 15,
  notifyDaysBefore: 3,
  nextDueDate: new Date().toISOString().slice(0, 10),
};

export default function StaffMaintenanceSchedulesPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const canManageVendors =
    user?.role === "admin" || user?.role === "treasurer";
  const [schedules, setSchedules] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await schedulesApi.listMaintenanceSchedules();
    setSchedules(data.schedules ?? []);
    if (canManageVendors) {
      const vendorData = await vendorsApi.listVendors({ activeOnly: true });
      setVendors(vendorData.vendors ?? []);
    }
  }, [canManageVendors]);

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load schedules"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        vendorId: form.vendorId || null,
        frequency: form.frequency,
        notifyDaysBefore: Number(form.notifyDaysBefore),
        nextDueDate: form.nextDueDate,
      };
      if (form.frequency === "weekly") {
        body.dayOfWeek = Number(form.dayOfWeek);
      } else {
        body.dayOfMonth = Number(form.dayOfMonth);
      }
      await schedulesApi.createMaintenanceSchedule(body);
      setForm(emptyForm);
      setSuccess("Schedule created");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(schedule) {
    setBusy(true);
    setError(null);
    try {
      await schedulesApi.updateMaintenanceSchedule(schedule.id, {
        isActive: !schedule.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <DashboardLayout
      title="Maintenance schedules"
      subtitle="Recurring preventive maintenance plans"
      backTo={`/${societySlug}/staff`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="staff"
      wide
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            New schedule
          </h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <FormField label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={3}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={inputClassName}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category">
                <select
                  className={inputClassName}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Frequency">
                <select
                  className={inputClassName}
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value })
                  }
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </FormField>
              {form.frequency === "weekly" ? (
                <FormField label="Day of week (0=Sun)">
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={form.dayOfWeek}
                    onChange={(e) =>
                      setForm({ ...form, dayOfWeek: e.target.value })
                    }
                    required
                  />
                </FormField>
              ) : (
                <FormField label="Day of month (1–28)">
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={form.dayOfMonth}
                    onChange={(e) =>
                      setForm({ ...form, dayOfMonth: e.target.value })
                    }
                    required
                  />
                </FormField>
              )}
              <FormField label="Next due date">
                <Input
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) =>
                    setForm({ ...form, nextDueDate: e.target.value })
                  }
                  required
                />
              </FormField>
              <FormField label="Notify days before">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.notifyDaysBefore}
                  onChange={(e) =>
                    setForm({ ...form, notifyDaysBefore: e.target.value })
                  }
                />
              </FormField>
              {canManageVendors && (
                <FormField label="Vendor (optional)">
                  <select
                    className={inputClassName}
                    value={form.vendorId}
                    onChange={(e) =>
                      setForm({ ...form, vendorId: e.target.value })
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
            <Button type="submit" disabled={busy}>
              Create schedule
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Active & paused schedules
          </h2>
          <ul className="mt-3 space-y-3">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{s.title}</p>
                  <p className="text-sm text-slate-600">
                    {s.category} · {s.frequency} · next{" "}
                    {formatDisplayDate(s.nextDueDate)}
                    {s.vendorName ? ` · ${s.vendorName}` : ""}
                  </p>
                  <Badge variant={s.isActive ? "paid" : "cancelled"}>
                    {s.isActive ? "active" : "paused"}
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => toggleActive(s)}
                >
                  {s.isActive ? "Pause" : "Resume"}
                </Button>
              </li>
            ))}
            {schedules.length === 0 && (
              <li className="text-sm text-slate-600">No schedules yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
