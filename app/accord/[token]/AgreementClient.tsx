"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PublicAgreement, SacemMember } from "@/modules/edition/lib/agreement-types";
import { formatPct } from "@/modules/edition/lib/sacem-keys";
import { roleLabel } from "@/modules/edition/lib/work-fields";
import { userErrorMessage } from "@/lib/user-error";

type Response = PublicAgreement | { state: "unknown" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#101010] px-4 py-10 text-[#F5F5F5] sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-[10px] font-semibold uppercase tracking-[.2em] text-[#F0FF00]">SIDEKICK · Accord de répartition</p>
        {children}
      </div>
    </main>
  );
}

function Dead({ title, text }: { title: string; text: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-[#F5F5F5]/60">{text}</p>
    </Shell>
  );
}

const MEMBER_CHOICES: { value: SacemMember; label: string }[] = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "unknown", label: "Je ne sais pas" },
];

export function AgreementClient({ token }: { token: string }) {
  const { data, isLoading, mutate } = useSWR<Response>(
    ["accord", token],
    async () => {
      const res = await fetch(`/api/accord/${encodeURIComponent(token)}`);
      if (!res.ok) return { state: "unknown" as const };
      return (await res.json()) as Response;
    },
    { revalidateOnFocus: false },
  );

  if (isLoading || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101010]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F0FF00] border-t-transparent" aria-label="Chargement" />
      </main>
    );
  }
  if (data.state === "unknown") return <Dead title="Lien introuvable" text="Ce lien n’existe pas ou a été remplacé par un plus récent. Demande un nouveau lien à la personne qui te l’a envoyé." />;
  if (data.state === "superseded") return <Dead title="Cet accord a été remplacé" text="La répartition a été modifiée depuis. Une nouvelle version va t’être envoyée : c’est elle qu’il faudra valider." />;
  if (data.state === "cancelled") return <Dead title="Cet accord a été annulé" text="La personne qui te l’a envoyé l’a retiré. Rien n’est attendu de toi pour l’instant." />;

  return <Open data={data} token={token} onUpdate={(next) => void mutate(next, false)} />;
}

function Open({ data, token, onUpdate }: { data: PublicAgreement; token: string; onUpdate: (next: PublicAgreement) => void }) {
  const { snapshot, me } = data;
  const mePerson = snapshot.persons.find((p) => p.id === me.personId);
  const [legalName, setLegalName] = useState(me.info?.legalName || [mePerson?.firstName, mePerson?.name].filter(Boolean).join(" "));
  const [pseudonym, setPseudonym] = useState(me.info?.pseudonym ?? mePerson?.pseudonym ?? "");
  const [ipi, setIpi] = useState(me.info?.ipi ?? "");
  const [member, setMember] = useState<SacemMember>(me.info?.sacemMember ?? "unknown");
  const [contesting, setContesting] = useState(false);
  const [comment, setComment] = useState(me.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(me.status === "pending");

  const respond = async (decision: "validate" | "contest") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/accord/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment, info: { legalName, pseudonym, ipi, sacemMember: member } }),
      });
      const json = (await res.json().catch(() => ({}))) as PublicAgreement & { error?: string };
      if (!res.ok) throw new Error(json.error || "Ta réponse n’a pas pu être enregistrée.");
      onUpdate(json);
      setEditing(false);
      setContesting(false);
    } catch (e) {
      setError(userErrorMessage(e, "Ta réponse n’a pas pu être enregistrée."));
    } finally {
      setBusy(false);
    }
  };

  const validatedCount = data.signers.filter((s) => s.status === "validated").length;

  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">« {snapshot.title} »</h1>
      <p className="mt-3 text-sm text-[#F5F5F5]/65">
        <span className="text-[#F5F5F5]">{snapshot.proposedBy}</span> te propose la répartition des droits d’auteur de cette œuvre. Vérifie ta part et celle des autres, complète tes informations, puis valide ou conteste.
      </p>

      <section className="mt-8 rounded-xl border border-[#F5F5F5]/[.09] bg-[rgba(44,44,46,.45)]">
        <div className="flex items-center justify-between border-b border-[#F5F5F5]/[.06] px-5 py-3">
          <h2 className="text-sm font-semibold">La répartition proposée</h2>
          <span className="text-xs text-[#F5F5F5]/45">Version {data.version} · {validatedCount}/{data.signers.length} validé{validatedCount > 1 ? "s" : ""}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#F5F5F5]/40">
              <th className="px-5 pb-2 pt-3 font-medium">Ayant droit</th>
              <th className="px-2 pb-2 pt-3 text-right font-medium" title="Droits d'exécution publique : radio, concerts, streaming…">DEP</th>
              <th className="px-5 pb-2 pt-3 text-right font-medium" title="Droits de reproduction mécanique : disques, téléchargements…">DRM</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.persons.map((p) => {
              const signer = data.signers.find((s) => s.personId === p.id);
              const isMe = p.id === me.personId;
              return (
                <tr key={p.id} className={cn("border-t border-[#F5F5F5]/[.06]", isMe && "bg-[#F0FF00]/[.05]")}>
                  <td className="px-5 py-2.5">
                    <span className="font-medium">{p.pseudonym || [p.firstName, p.name].filter(Boolean).join(" ")}</span>
                    {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#F0FF00]">toi</span>}
                    <span className="block text-xs text-[#F5F5F5]/45">
                      {p.roles.map(roleLabel).join(", ")}
                      {signer?.status === "validated" && " · a validé"}
                      {signer?.status === "contested" && " · conteste"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{formatPct(p.depPct)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatPct(p.drmPct)}</td>
                </tr>
              );
            })}
            {snapshot.publishers.map((pub) => (
              <tr key={pub.id} className="border-t border-[#F5F5F5]/[.06]">
                <td className="px-5 py-2.5">
                  <span className="font-medium">{pub.name}</span>
                  <span className="block text-xs text-[#F5F5F5]/45">Éditeur</span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatPct(pub.depPct)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatPct(pub.drmPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#F5F5F5]/[.06] px-5 py-3 text-xs text-[#F5F5F5]/45">
          Pourcentages de l’œuvre entière, selon les clés de répartition de la SACEM.
        </p>
      </section>

      {!editing ? (
        <section className="mt-6 rounded-xl border border-[#F5F5F5]/[.09] p-5">
          {me.status === "validated" ? (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <Check size={16} /> Tu as validé cette répartition{me.respondedAt ? ` le ${new Date(me.respondedAt).toLocaleDateString("fr-FR")}` : ""}.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-rose-300">
                <X size={16} /> Tu as contesté cette répartition.
              </p>
              {me.comment && <p className="text-sm text-[#F5F5F5]/60">« {me.comment} »</p>}
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditing(true)}>
            Changer ma réponse
          </Button>
        </section>
      ) : (
        <section className="mt-6 space-y-5 rounded-xl border border-[#F5F5F5]/[.09] p-5">
          <h2 className="text-sm font-semibold">Tes informations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legal" className="text-xs text-[#F5F5F5]/65">Nom civil *</Label>
              <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Prénom Nom" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pseudo" className="text-xs text-[#F5F5F5]/65">Pseudonyme</Label>
              <Input id="pseudo" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipi" className="text-xs text-[#F5F5F5]/65">Numéro IPI</Label>
              <Input id="ipi" value={ipi} onChange={(e) => setIpi(e.target.value)} inputMode="numeric" placeholder="9 à 11 chiffres, si tu en as un" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#F5F5F5]/65">Sociétaire de la SACEM ?</p>
              <div className="flex gap-1.5" role="radiogroup" aria-label="Sociétaire de la SACEM">
                {MEMBER_CHOICES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={member === c.value}
                    onClick={() => setMember(c.value)}
                    className={cn("rounded-full px-3 py-1.5 text-xs", member === c.value ? "bg-[#F0FF00]/15 text-[#F0FF00]" : "bg-[#F5F5F5]/[.07] text-[#F5F5F5]/60")}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {contesting && (
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-xs text-[#F5F5F5]/65">Qu’est-ce qui ne va pas ? *</Label>
              <Textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Par exemple : j’ai aussi écrit le deuxième couplet, je pense que ma part devrait être plus élevée." />
            </div>
          )}

          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {!contesting ? (
              <>
                <Button disabled={busy || !legalName.trim()} onClick={() => void respond("validate")}>
                  <ShieldCheck size={14} className="mr-2" />
                  Je valide cette répartition
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setContesting(true)}>
                  Je conteste
                </Button>
              </>
            ) : (
              <>
                <Button variant="destructive" disabled={busy || !legalName.trim() || !comment.trim()} onClick={() => void respond("contest")}>
                  Envoyer ma contestation
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => { setContesting(false); setError(null); }}>
                  Retour
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs leading-relaxed text-[#F5F5F5]/40">
        Ta réponse est enregistrée avec sa date et la version de la répartition. Elle vaut accord entre co-auteurs sur les parts ci-dessus : elle ne remplace pas la déclaration de l’œuvre à la SACEM, que chacun reste libre de vérifier dans son espace membre. Ton nom civil, ton pseudonyme, ton IPI et ta réponse sont transmis à {snapshot.proposedBy} pour la déclaration de l’œuvre, et à personne d’autre.
      </p>
    </Shell>
  );
}
