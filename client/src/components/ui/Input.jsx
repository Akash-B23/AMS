export const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const textareaClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20";

export default function Input({ className = "", ...props }) {
  return <input className={`${inputClassName} ${className}`} {...props} />;
}
