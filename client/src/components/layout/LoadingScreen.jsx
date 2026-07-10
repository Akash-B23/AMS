export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
