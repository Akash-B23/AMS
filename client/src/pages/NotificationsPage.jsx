import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as notificationsApi from "../api/notifications";
import DashboardLayout from "../components/layout/DashboardLayout";
import LoadingScreen from "../components/layout/LoadingScreen";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { formatDisplayDate } from "../utils/money";

export default function NotificationsPage() {
  const { societySlug } = useParams();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isStaff = [
    "manager",
    "admin",
    "treasurer",
    "association_staff",
  ].includes(user?.role);
  const basePath = isStaff ? "staff" : "resident";

  const load = useCallback(async () => {
    const data = await notificationsApi.listNotifications({ limit: 100 });
    setNotifications(data.notifications ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleMarkRead(id) {
    await notificationsApi.markNotificationRead(id);
    await load();
  }

  async function handleMarkAll() {
    await notificationsApi.markAllNotificationsRead();
    await load();
  }

  if (loading) return <LoadingScreen />;

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={user?.email}
      backTo={`/${societySlug}/${basePath}`}
      onLogout={logout}
      societySlug={societySlug}
      notificationBasePath={basePath}
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleMarkAll}>
            Mark all read
          </Button>
        </div>
        {notifications.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">No notifications yet.</p>
          </Card>
        )}
        {notifications.map((n) => (
          <Card key={n.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatDisplayDate(n.createdAt?.slice?.(0, 10) ?? n.createdAt)}
                  {n.readAt ? " · read" : " · unread"}
                </p>
              </div>
              {!n.readAt && (
                <Button variant="secondary" onClick={() => handleMarkRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
