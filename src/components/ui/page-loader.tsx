export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-24">
      <div className="h-8 w-8 rounded-full border-2 border-[#F0FF00] border-t-transparent animate-spin" />
      <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
        Chargement des données…
      </p>
    </div>
  );
}
