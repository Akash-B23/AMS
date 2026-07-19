import { Link } from "react-router-dom";
import Button from "../ui/Button";
import NotificationBell from "./NotificationBell";

export default function DashboardLayout({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  onLogout,
  children,
  wide = false,
  societySlug = null,
  notificationBasePath = null,
}) {
  return (
    <div className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            AMS
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {societySlug && notificationBasePath && (
            <NotificationBell
              societySlug={societySlug}
              basePath={notificationBasePath}
            />
          )}
          {backTo && (
            <Link
              to={backTo}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 no-underline hover:bg-white hover:text-slate-900"
            >
              {backLabel}
            </Link>
          )}
          <Button variant="secondary" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
