import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as masterDataApi from "../api/masterData";
import * as residentsApi from "../api/residents";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input, { inputClassName } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { formatPaiseAsRupees } from "../utils/money";

const emptyMoveIn = {
  flatId: "",
  name: "",
  phone: "",
  email: "",
  residentType: "owner",
  password: "",
};

export default function StaffResidentsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "manager";

  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState(emptyMoveIn);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingMoveOut, setPendingMoveOut] = useState(null);

  const load = useCallback(async () => {
    const [residentData, flatData] = await Promise.all([
      residentsApi.listResidents({ active: !showInactive }),
      canWrite ? masterDataApi.listFlats() : Promise.resolve({ flats: [] }),
    ]);
    setResidents(residentData.residents ?? []);
    setFlats(flatData.flats ?? []);
  }, [showInactive, canWrite]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Failed to load residents"))
      .finally(() => setLoading(false));
  }, [load]);

  const flatOptions = useMemo(
    () =>
      flats.map((f) => ({
        id: f.id,
        label: `${f.blockName} · ${f.flatNumber}`,
      })),
    [flats],
  );

  async function handleMoveIn(e) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await residentsApi.moveInResident({
        flatId: form.flatId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim(),
        residentType: form.residentType,
        password: form.password,
      });
      setSuccess("Resident moved in and login created.");
      setForm(emptyMoveIn);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Move-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveOut(resident, confirmDespiteDues = false) {
    if (!canWrite) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await residentsApi.moveOutResident(resident.id, {
        confirmDespiteDues,
      });
      setPendingMoveOut(null);
      const duesNote =
        result.pendingInvoiceCount > 0
          ? ` Flat still has ${result.pendingInvoiceCount} pending invoice(s) totaling ${formatPaiseAsRupees(result.pendingAmountPaise)}.`
          : "";
      setSuccess(`Moved out ${resident.name}.${duesNote}`);
      await load();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.body?.code === "pending_dues"
      ) {
        setPendingMoveOut({
          resident,
          pendingInvoiceCount: err.body.pendingInvoiceCount,
          pendingAmountPaise: err.body.pendingAmountPaise,
        });
        setError(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Move-out failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading && residents.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout
      title="Residents"
      subtitle="Move-in and move-out for owners and tenants"
      backTo={`/${societySlug}/staff`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath="staff"
      wide
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {pendingMoveOut && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Confirm move-out
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {pendingMoveOut.resident.name}&apos;s flat has{" "}
              <strong>{pendingMoveOut.pendingInvoiceCount}</strong> pending
              invoice(s) totaling{" "}
              <strong>
                {formatPaiseAsRupees(pendingMoveOut.pendingAmountPaise)}
              </strong>
              . Move-out is allowed; invoices stay on the flat.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => handleMoveOut(pendingMoveOut.resident, true)}
              >
                Move out anyway
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setPendingMoveOut(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {canWrite && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">Move in</h2>
            <p className="mt-1 text-sm text-slate-600">
              Creates the resident record and a login. Share the temporary
              password out of band.
            </p>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleMoveIn}>
              <div className="sm:col-span-2">
                <FormField label="Flat">
                  <select
                    className={inputClassName}
                    required
                    value={form.flatId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, flatId: e.target.value }))
                    }
                  >
                    <option value="">Select flat</option>
                    {flatOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Name">
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Type">
                <select
                  className={inputClassName}
                  value={form.residentType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, residentType: e.target.value }))
                  }
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </FormField>
              <FormField label="Email (login)">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Temporary password">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  Move in
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Occupancy list
            </h2>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Include inactive
            </label>
          </div>

          {residents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No residents found.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {residents.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <Badge variant={r.residentType}>{r.residentType}</Badge>
                      {!r.isActive && <Badge variant="cancelled">inactive</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {r.blockName} · {r.flatNumber}
                      {r.userEmail || r.email
                        ? ` · ${r.userEmail || r.email}`
                        : ""}
                    </p>
                  </div>
                  {canWrite && r.isActive && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => handleMoveOut(r, false)}
                    >
                      Move out
                    </Button>
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
