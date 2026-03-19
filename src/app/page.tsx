export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101010] px-6 py-16 text-[#F5F5F5]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,255,0,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-[rgba(245,245,245,0.14)] bg-[rgba(44,44,46,0.72)] p-8 text-center shadow-2xl backdrop-blur-xl md:p-12">
        <p className="mb-3 inline-flex rounded-full border border-[rgba(245,245,245,0.18)] bg-[rgba(15,23,42,0.85)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#F5F5F5]/70">
          Sidekick Studio OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Sidekick for Independent Artists
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#F5F5F5]/72 md:text-base">
          Centralize your admin, publishing, phono, live, tasks, contacts,
          calendar, incomes and marketing in one premium workspace.
        </p>
      </div>
    </main>
  );
}
