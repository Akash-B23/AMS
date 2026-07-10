export default function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
