const variants = {
  owner: "bg-brand-100 text-brand-800",
  tenant: "bg-sky-100 text-sky-800",
  role: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-900",
};

export default function Badge({ variant = "role", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
