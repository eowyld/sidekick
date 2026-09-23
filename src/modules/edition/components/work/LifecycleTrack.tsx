import { cn } from "@/lib/utils";
import type { AgreementSummary } from "../../lib/agreement-types";
import { needsAgreement, STEP_META, stepLabel, TIMELINE_LABELS, type LifecycleStep } from "../../lib/work-lifecycle";
import type { Work } from "@/lib/sidekick-store";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";

/** Pastille compacte de l'étape, pour la liste. */
export function StepBadge({ step, agreement }: { step: LifecycleStep; agreement: AgreementSummary | null }) {
  const meta = STEP_META[step];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${meta.color}1f`, color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {stepLabel(step, agreement)}
    </span>
  );
}

/** Frise des cinq étapes. Une œuvre solo n'a pas d'étape d'accord : elle est affichée « sans objet ». */
export function LifecycleTrack({ step, work, agreement }: { step: LifecycleStep; work: Pick<Work, "persons">; agreement: AgreementSummary | null }) {
  const current = STEP_META[step].index;
  const solo = !needsAgreement(work);
  return (
    <ol className="flex flex-wrap items-center gap-y-2" aria-label="Cycle de vie de l'œuvre">
      {TIMELINE_LABELS.map((label, i) => {
        // Accord fermé pour l'alpha : ses deux étapes ne sont pas affichées du tout.
        if (!EDITION_AGREEMENTS_OPEN && (i === 1 || i === 2)) return null;
        const skipped = solo && (i === 1 || i === 2);
        const done = i < current || (i === current && step !== "agreement-pending" && step !== "agreement-contested");
        const here = i === current;
        const text = here ? stepLabel(step, agreement) : label;
        return (
          <li key={label} className="flex items-center">
            {i > 0 && <span className={cn("mx-2 h-px w-6", i <= current ? "bg-[#F5F5F5]/35" : "bg-[#F5F5F5]/10")} />}
            <span
              aria-current={here ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                skipped ? "text-[#F5F5F5]/25 line-through" : here ? "font-medium" : done ? "text-[#F5F5F5]/70" : "text-[#F5F5F5]/35",
              )}
              style={here ? { color: STEP_META[step].color } : undefined}
            >
              <span
                className={cn("h-2 w-2 rounded-full", !here && (done ? "bg-[#F5F5F5]/50" : "bg-[#F5F5F5]/15"))}
                style={here ? { background: STEP_META[step].color } : undefined}
              />
              {text}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
