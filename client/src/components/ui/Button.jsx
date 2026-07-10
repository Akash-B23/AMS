const variants = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 focus:ring-brand-600",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400",
  danger:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 focus:ring-red-400",
  ghost:
    "bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400",
};

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
