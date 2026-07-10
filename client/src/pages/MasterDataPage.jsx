import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as masterDataApi from "../api/masterData";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { textareaClassName } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { parseAmenitiesCsv, parseMaintenanceCsv } from "../utils/csv";
import { parseFlatCsv } from "../utils/onboarding";

const TABS = [
  { id: "structure", label: "Structure" },
  { id: "maintenance", label: "Maintenance" },
  { id: "amenities", label: "Amenities" },
];

export default function MasterDataPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("structure");
  const [summary, setSummary] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadData = useCallback(async () => {
    const [summaryData, amenitiesData] = await Promise.all([
      masterDataApi.getSummary(),
      masterDataApi.listAmenities(),
    ]);
    setSummary(summaryData);
    setAmenities(amenitiesData.amenities);
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => setError("Failed to load master data"))
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleImport(parseFn, importFn) {
    setError(null);
    setImportResult(null);
    const parsed = parseFn(csvText);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const result = await importFn(parsed.rows);
      setImportResult(result);
      if (result.errors?.length) {
        const count = result.created ?? result.updated ?? 0;
        setError(
          `Processed ${count} row(s). ${result.errors.length} row(s) had errors.`,
        );
      }
      await loadData();
      setCsvText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading master data..." />;
  }

  return (
    <DashboardLayout
      title="Master data"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email} (${user?.role})`
          : `${user?.email} (${user?.role})`
      }
      backTo={`/${societySlug}/staff`}
      backLabel="Staff portal"
      onLogout={logout}
      wide
    >
      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Card className="!p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">{summary.blockCount}</p>
            <p className="text-xs text-slate-600">Blocks</p>
          </Card>
          <Card className="!p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">{summary.flatCount}</p>
            <p className="text-xs text-slate-600">Flats</p>
          </Card>
          <Card className="!p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">{summary.amenityCount}</p>
            <p className="text-xs text-slate-600">Amenities</p>
          </Card>
          <Card className="!p-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">
              {summary.flatsMissingMaintenance}
            </p>
            <p className="text-xs text-slate-600">Missing maintenance</p>
          </Card>
        </div>
      )}

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Import sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setCsvText("");
              setError(null);
              setImportResult(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${
              tab === t.id
                ? "bg-brand-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <Card className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {importResult && (
          <Alert variant="info">
            {importResult.created != null && `Created ${importResult.created}. `}
            {importResult.updated != null && `Updated ${importResult.updated}. `}
            {importResult.skipped != null && `Skipped ${importResult.skipped}.`}
          </Alert>
        )}

        {tab === "structure" && (
          <>
            <p className="text-sm text-slate-600">
              Import blocks and flats via CSV paste.
            </p>
            <label htmlFor="structure-csv" className="text-sm font-medium text-slate-700">
              CSV format: block_name, flat_number, floor (optional)
            </label>
            <textarea
              id="structure-csv"
              rows={6}
              className={textareaClassName}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"block_name,flat_number,floor\nBlock A,201,2"}
            />
            <Button
              type="button"
              disabled={submitting}
              onClick={() =>
                handleImport(parseFlatCsv, masterDataApi.importFlats)
              }
            >
              {submitting ? "Importing..." : "Import flats"}
            </Button>
          </>
        )}

        {tab === "maintenance" && (
          <>
            <p className="text-sm text-slate-600">
              Set monthly maintenance amounts per flat via CSV.
            </p>
            <label htmlFor="maintenance-csv" className="text-sm font-medium text-slate-700">
              CSV format: block_name, flat_number, maintenance_amount (rupees)
            </label>
            <textarea
              id="maintenance-csv"
              rows={6}
              className={textareaClassName}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"block_name,flat_number,maintenance_amount\nBlock A,101,5000"}
            />
            <Button
              type="button"
              disabled={submitting}
              onClick={() =>
                handleImport(
                  parseMaintenanceCsv,
                  masterDataApi.importMaintenance,
                )
              }
            >
              {submitting ? "Importing..." : "Import maintenance"}
            </Button>
          </>
        )}

        {tab === "amenities" && (
          <>
            <p className="text-sm text-slate-600">
              Import society amenities via CSV.
            </p>
            <label htmlFor="amenities-csv" className="text-sm font-medium text-slate-700">
              CSV format: name, description
            </label>
            <textarea
              id="amenities-csv"
              rows={6}
              className={textareaClassName}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"name,description\nPool,Swimming pool\nGym,Fitness center"}
            />
            <Button
              type="button"
              disabled={submitting}
              onClick={() =>
                handleImport(
                  parseAmenitiesCsv,
                  masterDataApi.importAmenities,
                )
              }
            >
              {submitting ? "Importing..." : "Import amenities"}
            </Button>

            {amenities.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amenities.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{a.name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {a.description ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
