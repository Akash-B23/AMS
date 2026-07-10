import { Link } from "react-router-dom";
import Button from "../ui/Button";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            AMS
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        {footer && (
          <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
            {footer}
          </div>
        )}
      </main>
    </div>
  );
}

export function AuthFooterLink({ to, children }) {
  return (
    <Link to={to} className="font-medium text-brand-700 no-underline hover:underline">
      {children}
    </Link>
  );
}

export function AuthFooterText({ children }) {
  return <p>{children}</p>;
}
