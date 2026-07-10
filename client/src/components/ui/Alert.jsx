const variants = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export default function Alert({ variant = "info", children, className = "" }) {
  return (
    <p
      role="alert"
      className={`rounded-lg border px-3 py-2.5 text-sm ${variants[variant]} ${className}`}
    >
      {children}
    </p>
  );
}
