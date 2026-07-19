import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as notificationsApi from "../../api/notifications";

export default function NotificationBell({ societySlug, basePath }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.listNotifications({ limit: 20 });
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* ignore transient errors in header */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function handleMarkRead(id) {
    await notificationsApi.markNotificationRead(id);
    await load();
  }

  async function handleMarkAll() {
    await notificationsApi.markAllNotificationsRead();
    await load();
  }

  const inboxPath = `/${societySlug}/${basePath}/notifications`;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
        aria-label="Notifications"
      >
        Alerts
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Mark all read
            </button>
          </div>
          {loading && (
            <p className="py-4 text-center text-sm text-slate-500">Loading…</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">
              No notifications yet.
            </p>
          )}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border px-2.5 py-2 ${
                  n.readAt
                    ? "border-slate-100 bg-slate-50"
                    : "border-brand-100 bg-brand-50/40"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                {!n.readAt && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Link
            to={inboxPath}
            onClick={() => setOpen(false)}
            className="mt-3 block text-center text-xs font-medium text-brand-700 no-underline hover:underline"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
