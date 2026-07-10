export default function FormField({ label, hint, children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
