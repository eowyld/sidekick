"use client";

import { useState } from "react";
import { Check, Copy, History, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Person, Work } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEditionAgreements } from "@/hooks/useEditionAgreements";
import { cn } from "@/lib/utils";
import type { Agreement, AgreementSigner } from "../../lib/agreement-types";
import { isActiveAgreement } from "../../lib/agreement-types";
import { splitsValid } from "../../lib/rights-shares";
import { needsAgreement } from "../../lib/work-lifecycle";
import { personDisplayName } from "../../lib/work-fields";
import { userErrorMessage } from "@/lib/user-error";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const SACEM_MEMBER: Record<string, string> = { yes: "sociétaire SACEM", no: "pas sociétaire SACEM", unknown: "" };

function SignerState({ signer }: { signer: AgreementSigner }) {
  if (signer.status === "validated")
    return <span className="text-xs text-emerald-400">{signer.isOwner ? "Toi · validé d'office" : `Validé le ${signer.respondedAt ? dateTime(signer.respondedAt) : ""}`}</span>;
  if (signer.status === "contested") return <span className="text-xs text-rose-300">Conteste la répartition</span>;
  if (signer.openedAt) return <span className="text-xs text-amber-300">Lien ouvert le {dateTime(signer.openedAt)}, pas encore de réponse</span>;
  if (signer.sentAt) return <span className="text-xs text-[#F5F5F5]/55">Envoyé par email le {dateTime(signer.sentAt)}</span>;
  return <span className="text-xs text-[#F5F5F5]/45">En attente</span>;
}

function SignerRow({
  agreement,
  signer,
  token,
  onToken,
}: {
  agreement: Agreement;
  signer: AgreementSigner;
  token: string | undefined;
  onToken: (token: string) => void;
}) {
  const { regenerateToken, emailLink } = useEditionAgreements();
  const [email, setEmail] = useState(signer.email ?? "");
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = signer.info;

  const ensureToken = async () => {
    if (token) return token;
    const fresh = await regenerateToken(agreement.id, signer.id);
    onToken(fresh);
    return fresh;
  };

  const copy = async () => {
    setBusy(true);
    try {
      const t = await ensureToken();
      await navigator.clipboard.writeText(`${window.location.origin}/accord/${t}`);
      toast.success(token ? `Lien de ${signer.displayName} copié.` : `Nouveau lien de ${signer.displayName} copié. L'ancien ne fonctionne plus.`);
    } catch (e) {
      toast.error(userErrorMessage(e, "Impossible de copier le lien."));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      const t = await ensureToken();
      await emailLink(agreement.id, signer.id, email.trim(), t);
      toast.success(`Accord envoyé à ${signer.displayName}.`);
      setEmailOpen(false);
    } catch (e) {
      toast.error(userErrorMessage(e, "L'envoi a échoué."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            signer.status === "validated" ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : signer.status === "contested" ? "border-rose-400/40 bg-rose-400/15 text-rose-300" : "border-[#F5F5F5]/20",
          )}
        >
          {signer.status === "validated" && <Check size={12} />}
        </span>
        <span className="text-sm font-medium">{signer.displayName}</span>
        <SignerState signer={signer} />
        {!signer.isOwner && isActiveAgreement(agreement) && (
          <div className="ml-auto flex gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void copy()}>
              {token ? <Copy size={13} className="mr-1.5" /> : <RefreshCw size={13} className="mr-1.5" />}
              {token ? "Copier le lien" : "Nouveau lien"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEmailOpen((v) => !v)} aria-expanded={emailOpen}>
              <Mail size={13} className="mr-1.5" />
              Email
            </Button>
          </div>
        )}
      </div>
      {signer.status === "contested" && signer.comment && (
        <p className="ml-8 rounded-lg border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-sm text-rose-200">« {signer.comment} »</p>
      )}
      {info && !signer.isOwner && (info.legalName || info.ipi || info.sacemMember !== "unknown") && (
        <p className="ml-8 text-xs text-[#F5F5F5]/50">
          {[info.legalName && `Nom civil : ${info.legalName}`, info.ipi && `IPI ${info.ipi}`, SACEM_MEMBER[info.sacemMember]].filter(Boolean).join(" · ")}
        </p>
      )}
      {emailOpen && (
        <div className="ml-8 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input type="email" aria-label={`Email de ${signer.displayName}`} placeholder="adresse@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={busy || !email.trim()} onClick={() => void send()}>
            <Send size={13} className="mr-1.5" />
            Envoyer
          </Button>
          {!token && <p className="w-full text-[11px] text-[#F5F5F5]/40">Un nouveau lien sera créé : celui que tu as peut-être déjà partagé cessera de fonctionner.</p>}
        </div>
      )}
    </li>
  );
}

/** Devine qui est l'artiste parmi les ayants droit : même nom civil, ou pseudonyme égal au nom d'artiste. */
export function guessOwner(persons: Person[], legalFull: string, artistName: string): string | null {
  const norm = (s: string) => s.trim().toLocaleLowerCase("fr-FR");
  const match = persons.find(
    (p) =>
      (legalFull && norm([p.firstName, p.name].filter(Boolean).join(" ")) === norm(legalFull)) ||
      (artistName && p.pseudonym && norm(p.pseudonym) === norm(artistName)),
  );
  return match?.id ?? null;
}

export function AgreementPanel({
  workId,
  work,
  dirty,
  agreements,
  defaultOwnerId,
}: {
  workId: string;
  work: Omit<Work, "id">;
  dirty: boolean;
  agreements: Agreement[];
  defaultOwnerId: string | null;
}) {
  const { sendAgreement, cancelAgreement, unavailable } = useEditionAgreements();
  const { confirm, confirmDialog } = useConfirm();
  const [ownerId, setOwnerId] = useState<string | null>(defaultOwnerId);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const active = agreements.find(isActiveAgreement) ?? null;
  const past = agreements.filter((a) => !isActiveAgreement(a));

  if (!needsAgreement(work)) {
    return (
      <p className="text-sm text-[#F5F5F5]/55">
        Tu es seul ayant droit : pas d’accord à faire valider. Ajoute un co-auteur pour lui envoyer la répartition.
      </p>
    );
  }
  if (unavailable) {
    return <p className="text-sm text-[#F5F5F5]/55">L’accord en ligne n’est pas encore disponible sur ton compte. Tes ayants droit et leurs parts restent enregistrés normalement.</p>;
  }

  const send = async () => {
    if (active && !(await confirm({ title: "Renvoyer l'accord ?", description: "Une nouvelle version remplace la précédente. Tous les co-auteurs devront revalider, et les liens déjà envoyés cesseront de fonctionner.", confirmLabel: "Renvoyer" }))) return;
    setBusy(true);
    try {
      const result = await sendAgreement(workId, work, ownerId);
      setTokens(result.tokens);
      toast.success(`Accord v${result.version} créé. Copie ou envoie le lien de chaque co-auteur.`);
    } catch (e) {
      toast.error(userErrorMessage(e, "Impossible d'envoyer l'accord."));
    } finally {
      setBusy(false);
    }
  };

  const release = async (reason?: "edit") => {
    if (!active) return;
    const ok = await confirm(
      reason === "edit"
        ? { title: "Modifier la répartition ?", description: "L'accord en cours est retiré et les liens envoyés cessent de fonctionner. Tu pourras renvoyer une nouvelle version à tous les co-auteurs.", confirmLabel: "Modifier" }
        : { title: "Annuler l'accord ?", description: "Les liens envoyés cessent de fonctionner. Les réponses déjà reçues restent dans l'historique.", confirmLabel: "Annuler l'accord" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await cancelAgreement(active.id, reason);
      setTokens({});
    } catch (e) {
      toast.error(userErrorMessage(e, "Opération impossible."));
    } finally {
      setBusy(false);
    }
  };

  const valid = splitsValid(work);

  return (
    <div className="space-y-4">
      {confirmDialog}
      {!active ? (
        <div className="space-y-4">
          <p className="text-sm text-[#F5F5F5]/65">
            Chaque co-auteur reçoit un lien personnel, vérifie sa part, complète son nom civil et son IPI, puis valide ou conteste. Tant que l’accord est en cours, la répartition est figée.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-[#F5F5F5]/55">Qui es-tu dans cette liste ? Ta ligne sera validée d’office.</p>
            <div className="flex flex-wrap gap-1.5">
              {work.persons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={ownerId === p.id}
                  onClick={() => setOwnerId(ownerId === p.id ? null : p.id)}
                  className={cn("rounded-full px-3 py-1 text-xs", ownerId === p.id ? "bg-[#F0FF00]/15 text-[#F0FF00]" : "bg-[#F5F5F5]/[.07] text-[#F5F5F5]/60 hover:bg-[#F5F5F5]/[.12]")}
                >
                  {personDisplayName(p)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={busy || dirty || !valid} onClick={() => void send()}>
              <ShieldCheck size={14} className="mr-2" />
              Envoyer l’accord aux co-auteurs
            </Button>
            {dirty && <span className="text-xs text-amber-300">Enregistre l’œuvre avant d’envoyer l’accord.</span>}
            {!dirty && !valid && <span className="text-xs text-rose-300">Les parts de chaque catégorie doivent totaliser 100 %.</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#F5F5F5]/55">
              Version {active.version} · envoyée le {day(active.createdAt)} ·{" "}
              {active.signers.filter((s) => s.status === "validated").length}/{active.signers.length} validé
              {active.signers.filter((s) => s.status === "validated").length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void release("edit")}>
                Modifier la répartition
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void release()}>
                Annuler l’accord
              </Button>
            </div>
          </div>
          {active.status === "validated" && (
            <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/[.07] px-3 py-2 text-sm text-emerald-300">
              Tous les co-auteurs ont validé. Tu peux déclarer l’œuvre à la SACEM avec cette répartition (onglet Déclaration).
            </p>
          )}
          {active.status === "contested" && (
            <p className="rounded-lg border border-rose-400/25 bg-rose-400/[.07] px-3 py-2 text-sm text-rose-200">
              Un co-auteur conteste. Discutez-en, puis « Modifier la répartition » et renvoie une nouvelle version.
            </p>
          )}
          <ul className="divide-y divide-[#F5F5F5]/[.06]">
            {active.signers.map((s) => (
              <SignerRow key={s.id} agreement={active} signer={s} token={tokens[s.id]} onToken={(t) => setTokens((prev) => ({ ...prev, [s.id]: t }))} />
            ))}
          </ul>
          <p className="text-[11px] text-[#F5F5F5]/40">
            Les liens ne sont affichables qu’au moment de leur création. Après un rechargement, « Nouveau lien » en crée un autre et désactive l’ancien.
          </p>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1.5 text-xs text-[#F5F5F5]/50 hover:text-[#F5F5F5]" aria-expanded={showHistory}>
            <History size={12} />
            {past.length} version{past.length > 1 ? "s" : ""} précédente{past.length > 1 ? "s" : ""}
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 text-xs text-[#F5F5F5]/50">
              {past.map((a) => (
                <li key={a.id}>
                  v{a.version} · {day(a.createdAt)} · {a.status === "superseded" ? "remplacée" : "annulée"} ·{" "}
                  {a.signers.filter((s) => s.status === "validated").length}/{a.signers.length} validés
                  {a.signers.some((s) => s.status === "contested") ? " · contestée" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
