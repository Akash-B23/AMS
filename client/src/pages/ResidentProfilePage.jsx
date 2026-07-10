import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import * as profileApi from "../api/profile";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input, { inputClassName } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

const EMPTY_VEHICLE = {
  registrationNumber: "",
  vehicleType: "car",
  makeModel: "",
  parkingSlot: "",
};

export default function ResidentProfilePage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    const data = await profileApi.getMyProfile();
    setProfile(data);
    setName(data.resident.name);
    setPhone(data.resident.phone ?? "");
    setVehicles(data.vehicles);
  }, []);

  useEffect(() => {
    loadProfile()
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  async function handleContactSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const data = await profileApi.updateMyProfile({ name, phone });
      setProfile(data);
      setSuccess("Contact details updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  function resetVehicleForm() {
    setVehicleForm(EMPTY_VEHICLE);
    setEditingVehicleId(null);
  }

  async function handleVehicleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      if (editingVehicleId) {
        await profileApi.updateVehicle(editingVehicleId, vehicleForm);
        setSuccess("Vehicle updated.");
      } else {
        await profileApi.addVehicle(vehicleForm);
        setSuccess("Vehicle added.");
      }
      resetVehicleForm();
      await loadProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Vehicle save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteVehicle(id) {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await profileApi.deleteVehicle(id);
      setSuccess("Vehicle removed.");
      resetVehicleForm();
      await loadProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditVehicle(vehicle) {
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      makeModel: vehicle.makeModel ?? "",
      parkingSlot: vehicle.parkingSlot ?? "",
    });
  }

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!profile) {
    return (
      <DashboardLayout title="My profile" onLogout={logout}>
        <Alert variant="error">Profile not found.</Alert>
      </DashboardLayout>
    );
  }

  const { resident } = profile;
  const occupancyVariant =
    resident.residentType === "owner" ? "owner" : "tenant";
  const occupancyLabel =
    resident.residentType === "owner" ? "Owner" : "Tenant";

  return (
    <DashboardLayout
      title="My profile"
      subtitle={
        user?.societyName
          ? `${user.societyName} · ${user.email}`
          : user?.email
      }
      backTo={`/${societySlug}/resident`}
      backLabel="Resident portal"
      onLogout={logout}
    >
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <div className="space-y-4">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">My flat</h2>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">{resident.flat.blockName}</span> — Flat{" "}
            {resident.flat.flatNumber}
            {resident.flat.floor != null && ` (Floor ${resident.flat.floor})`}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Occupancy:{" "}
            <Badge variant={occupancyVariant}>{occupancyLabel}</Badge>
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Contact</h2>
          <form onSubmit={handleContactSubmit} className="mt-4 flex flex-col gap-4">
            <FormField label="Email (login)" htmlFor="profile-email">
              <Input
                id="profile-email"
                type="email"
                value={profile.user.email}
                disabled
              />
            </FormField>
            <FormField label="Name" htmlFor="profile-name">
              <Input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Phone" htmlFor="profile-phone">
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Saving..." : "Save contact details"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Vehicles</h2>

          {vehicles.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Registration</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Make / model</th>
                    <th className="px-3 py-2 font-medium">Parking</th>
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{v.registrationNumber}</td>
                      <td className="px-3 py-2 capitalize">{v.vehicleType}</td>
                      <td className="px-3 py-2">{v.makeModel ?? "—"}</td>
                      <td className="px-3 py-2">{v.parkingSlot ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => startEditVehicle(v)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => handleDeleteVehicle(v.id)}
                            disabled={submitting}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleVehicleSubmit} className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingVehicleId ? "Edit vehicle" : "Add vehicle"}
            </h3>

            <FormField label="Registration number" htmlFor="vehicle-reg">
              <Input
                id="vehicle-reg"
                type="text"
                value={vehicleForm.registrationNumber}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })
                }
                required
              />
            </FormField>

            <FormField label="Type" htmlFor="vehicle-type">
              <select
                id="vehicle-type"
                className={inputClassName}
                value={vehicleForm.vehicleType}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })
                }
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Make / model" htmlFor="vehicle-model">
              <Input
                id="vehicle-model"
                type="text"
                value={vehicleForm.makeModel}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, makeModel: e.target.value })
                }
              />
            </FormField>

            <FormField label="Parking slot" htmlFor="vehicle-parking">
              <Input
                id="vehicle-parking"
                type="text"
                value={vehicleForm.parkingSlot}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, parkingSlot: e.target.value })
                }
              />
            </FormField>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingVehicleId
                    ? "Update vehicle"
                    : "Add vehicle"}
              </Button>
              {editingVehicleId && (
                <Button type="button" variant="secondary" onClick={resetVehicleForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
