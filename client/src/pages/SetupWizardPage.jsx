import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input, { textareaClassName } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import * as setupApi from "../api/setup";
import { parseFlatCsv, paiseToRupees, rupeesToPaise } from "../utils/onboarding";

const STEPS = ["Structure", "Maintenance", "Review"];

export default function SetupWizardPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [flats, setFlats] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [manualBlock, setManualBlock] = useState("");
  const [manualFlat, setManualFlat] = useState("");
  const [manualFloor, setManualFloor] = useState("");
  const [maintenanceByFlat, setMaintenanceByFlat] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadFlats = useCallback(async () => {
    const { flats: loaded } = await setupApi.listFlats();
    setFlats(loaded);
    const amounts = {};
    for (const flat of loaded) {
      amounts[flat.id] = paiseToRupees(flat.maintenanceAmountPaise);
    }
    setMaintenanceByFlat(amounts);
  }, []);

  useEffect(() => {
    loadFlats()
      .catch(() => setError("Failed to load setup data"))
      .finally(() => setLoading(false));
  }, [loadFlats]);

  async function handleCsvImport() {
    setError(null);
    setImportResult(null);
    const parsed = parseFlatCsv(csvText);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const result = await setupApi.importFlats(parsed.rows);
      setImportResult(result);
      if (result.errors?.length) {
        setError(
          `Imported ${result.created} flat(s). ${result.errors.length} row(s) had errors.`,
        );
      }
      await loadFlats();
      setCsvText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualAdd(e) {
    e.preventDefault();
    setError(null);
    if (!manualBlock.trim() || !manualFlat.trim()) {
      setError("Block name and flat number are required");
      return;
    }
    setSubmitting(true);
    try {
      const row = {
        blockName: manualBlock.trim(),
        flatNumber: manualFlat.trim(),
      };
      if (manualFloor) {
        row.floor = Number.parseInt(manualFloor, 10);
      }
      const result = await setupApi.importFlats([row]);
      if (result.errors?.length) {
        setError(result.errors[0].message);
      } else {
        setManualFlat("");
        setManualFloor("");
      }
      await loadFlats();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add flat");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMaintenanceNext() {
    setError(null);
    const amounts = [];
    for (const flat of flats) {
      const paise = rupeesToPaise(maintenanceByFlat[flat.id]);
      if (!paise) {
        setError(`Enter a valid maintenance amount for flat ${flat.flatNumber}`);
        return;
      }
      amounts.push({ flatId: flat.id, maintenanceAmountPaise: paise });
    }
    setSubmitting(true);
    try {
      await setupApi.updateMaintenance(amounts);
      await loadFlats();
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save amounts");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    setError(null);
    setSubmitting(true);
    try {
      await setupApi.completeSetup();
      navigate(`/${societySlug}/staff`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete setup");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading setup..." />;
  }

  const totalMaintenancePaise = flats.reduce(
    (sum, f) => sum + (f.maintenanceAmountPaise ?? 0),
    0,
  );

  return (
    <DashboardLayout
      title="Society setup"
      subtitle={`${user?.societyName} · Step ${step + 1} of ${STEPS.length}`}
      onLogout={logout}
      wide
    >
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Setup steps">
        {STEPS.map((name, i) => (
          <span
            key={name}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === step
                ? "bg-brand-700 text-white"
                : i < step
                  ? "bg-brand-100 text-brand-800"
                  : "bg-slate-200 text-slate-600"
            }`}
          >
            {i + 1}. {name}
          </span>
        ))}
      </nav>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {step === 0 && (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Building structure</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add blocks and flats manually or paste a CSV.
            </p>
          </div>

          <form onSubmit={handleManualAdd} className="flex flex-wrap gap-2">
            <Input
              className="min-w-[8rem] flex-1"
              placeholder="Block name"
              value={manualBlock}
              onChange={(e) => setManualBlock(e.target.value)}
            />
            <Input
              className="min-w-[6rem] flex-1"
              placeholder="Flat number"
              value={manualFlat}
              onChange={(e) => setManualFlat(e.target.value)}
            />
            <Input
              className="w-24"
              placeholder="Floor"
              value={manualFloor}
              onChange={(e) => setManualFloor(e.target.value)}
              type="number"
            />
            <Button type="submit" disabled={submitting}>
              Add flat
            </Button>
          </form>

          <div className="space-y-2">
            <label htmlFor="setup-csv" className="text-sm font-medium text-slate-700">
              CSV import (block_name, flat_number, floor)
            </label>
            <textarea
              id="setup-csv"
              rows={5}
              className={textareaClassName}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"block_name,flat_number,floor\nBlock A,101,1\nBlock A,102,1"}
            />
            <Button
              type="button"
              onClick={handleCsvImport}
              disabled={submitting || !csvText.trim()}
            >
              Import CSV
            </Button>
          </div>

          {importResult && (
            <Alert variant="info">
              Created {importResult.created}, skipped {importResult.skipped}
            </Alert>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Flats ({flats.length})
            </h3>
            {flats.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No flats yet. Add at least one to continue.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Block</th>
                      <th className="px-3 py-2 font-medium">Flat</th>
                      <th className="px-3 py-2 font-medium">Floor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flats.map((flat) => (
                      <tr key={flat.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{flat.blockName}</td>
                        <td className="px-3 py-2">{flat.flatNumber}</td>
                        <td className="px-3 py-2">{flat.floor ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={flats.length === 0 || submitting}
              onClick={() => setStep(1)}
            >
              Next: Maintenance
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Maintenance amounts</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter the monthly maintenance amount in rupees for each flat.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Block</th>
                  <th className="px-3 py-2 font-medium">Flat</th>
                  <th className="px-3 py-2 font-medium">Monthly (₹)</th>
                </tr>
              </thead>
              <tbody>
                {flats.map((flat) => (
                  <tr key={flat.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{flat.blockName}</td>
                    <td className="px-3 py-2">{flat.flatNumber}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={maintenanceByFlat[flat.id] ?? ""}
                        onChange={(e) =>
                          setMaintenanceByFlat((prev) => ({
                            ...prev,
                            [flat.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button type="button" onClick={handleMaintenanceNext} disabled={submitting}>
              Next: Review
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Review</h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm your society details before finishing setup.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-medium text-slate-900">Society:</span>{" "}
              {user?.societyName}
            </li>
            <li>
              <span className="font-medium text-slate-900">URL:</span> /{societySlug}
            </li>
            <li>
              <span className="font-medium text-slate-900">Blocks:</span>{" "}
              {new Set(flats.map((f) => f.blockName)).size}
            </li>
            <li>
              <span className="font-medium text-slate-900">Flats:</span> {flats.length}
            </li>
            <li>
              <span className="font-medium text-slate-900">Total monthly maintenance:</span>{" "}
              ₹
              {(totalMaintenancePaise / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" onClick={handleComplete} disabled={submitting}>
              {submitting ? "Completing..." : "Complete setup"}
            </Button>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
