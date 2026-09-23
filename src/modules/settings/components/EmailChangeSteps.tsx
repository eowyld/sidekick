"use client";

import { Check, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmailChangeStage = "sent" | "expired" | "done";

/** « 22/09 à 10 h 42 », ou « 10 h 42 » si c'est aujourd'hui. */
function formatWhen(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
  const today = new Date().toDateString() === d.toDateString();
  return today ? `aujourd’hui à ${time}` : `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${time}`;
}

/**
 * Suivi d'un changement d'adresse. « Secure email change » est désactivé dans
 * Supabase (22/09) : avec la double confirmation, le lien envoyé sur l'ancienne
 * adresse était refusé comme expiré (bug Supabase ouvert, supabase#32909). Un
 * seul lien part donc, sur la nouvelle adresse. La sécurité repose sur le mot
 * de passe actuel demandé avant la demande, et l'ancienne adresse est prévenue
 * après coup par la notification « Email address changed ».
 */
export function EmailChangeSteps({
  stage,
  currentEmail,
  newEmail,
  onResend,
  resending,
  cooldown,
  sentAt,
  hideAt,
  onDismiss,
}: {
  stage: EmailChangeStage;
  currentEmail: string;
  newEmail: string;
  /** Renvoie le lien. Absent une fois le changement terminé. */
  onResend?: () => void;
  resending?: boolean;
  /** Secondes avant de pouvoir renvoyer (Supabase impose un délai). */
  cooldown?: number;
  /** Envoi du lien (`email_change_sent_at`), en ms. */
  sentAt?: number | null;
  /** Étape « terminé » : moment où le récapitulatif disparaît, en ms. */
  hideAt?: number | null;
  onDismiss?: () => void;
}) {
  const reached = stage === "done" ? 2 : 1;

  const steps = [
    {
      title: "Lien envoyé",
      body: (
        <>
          Un lien de confirmation est parti sur <Strong>{newEmail}</Strong>
          {sentAt ? <>, {formatWhen(sentAt)}</> : null}.
        </>
      ),
    },
    {
      title: "Adresse modifiée",
      body:
        stage === "done" ? (
          <>
            Tu te connectes maintenant avec <Strong>{newEmail}</Strong>. Un email de sécurité a
            prévenu <Strong>{currentEmail}</Strong>.
          </>
        ) : stage === "expired" ? (
          <>
            Le lien a expiré sans être ouvert : ton adresse reste <Strong>{currentEmail}</Strong>.
            Renvoie un lien pour terminer le changement.
          </>
        ) : (
          <>
            Ouvre le lien reçu sur <Strong>{newEmail}</Strong>, depuis ce navigateur. D’ici là, tu
            te connectes toujours avec <Strong>{currentEmail}</Strong>.
          </>
        ),
    },
  ];

  return (
    <div className="rounded-md border border-[rgba(245,245,245,0.12)] px-4 py-4">
    <ol aria-label="Étapes du changement d’adresse">
      {steps.map((step, i) => {
        const index = i + 1;
        const done = index <= reached;
        const current = index === reached + 1;
        const last = index === steps.length;
        return (
          <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0" aria-current={current ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px",
                  index < reached ? "bg-[#F0FF00]/60" : "bg-[rgba(245,245,245,0.12)]"
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                done
                  ? "border-[#F0FF00] bg-[#F0FF00] text-[#101010]"
                  : current
                    ? "border-[#F0FF00] text-[#F0FF00]"
                    : "border-[rgba(245,245,245,0.2)] text-[#F5F5F5]/40"
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : index}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  done || current ? "text-[#F5F5F5]" : "text-[#F5F5F5]/45"
                )}
              >
                {step.title}
                {current ? (
                  <span className={cn("ml-2 text-xs font-normal", stage === "expired" ? "text-amber-300" : "text-[#F0FF00]")}>
                    {stage === "expired" ? "Lien expiré" : "En attente"}
                  </span>
                ) : null}
              </p>
              <p className={cn("mt-0.5 text-xs leading-relaxed", done || current ? "text-muted-foreground" : "text-[#F5F5F5]/35")}>
                {step.body}
              </p>
              {current && onResend ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="gap-1.5"
                    onClick={onResend}
                    disabled={resending || (cooldown ?? 0) > 0}
                  >
                    {resending ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
                    {(cooldown ?? 0) > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer le lien"}
                  </Button>
                  <span className="text-[11px] text-[#F5F5F5]/45">
                    Rien reçu ? Regarde aussi les spams. Un nouveau lien remplace le précédent.
                  </span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
    {stage === "done" && (hideAt || onDismiss) ? (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(245,245,245,0.08)] pt-3">
        <span className="text-[11px] text-[#F5F5F5]/45">
          {hideAt ? `Ce récapitulatif disparaît ${formatWhen(hideAt)}.` : null}
        </span>
        {onDismiss ? (
          <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={onDismiss}>
            <X className="size-3" />
            Masquer
          </Button>
        ) : null}
      </div>
    ) : null}
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-[#F5F5F5]/90">{children}</span>;
}
