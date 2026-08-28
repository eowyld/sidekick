type TagProps = {
  label: string;
  active?: boolean;
  count?: number;
};

export function Tag({ label, active, count }: TagProps) {
  const content =
    typeof count === "number" && count > 0 ? `${label} (${count})` : label;

  if (!active) {
    return (
      <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        {content}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-slate-500 bg-slate-800 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-50 shadow-sm">
      {content}
    </span>
  );
}
