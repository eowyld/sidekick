"use client";

import { useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  IdCard,
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Receipt,
  FileSignature,
  Calendar,
  MapPin,
} from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useContractsData } from "@/hooks/useContractsData";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import type { AdminStatus } from "@/lib/sidekick-store";
import type { AdminProcedure } from "@/hooks/useAdminData";
import type { Invoice } from "@/hooks/useIncomesData";
import {
  formatAeVatRegimeDisplay,
  formatStatusAddressLines,
  STATUS_FIELDS,
  typeLabel,
  type StatusFieldConfig,
} from "@/modules/admin/data/statuts-form-config";
import { formatApeDisplay } from "@/modules/admin/lib/naf-codes";
import { removeStatusLockedFolder } from "@/modules/admin/lib/status-folder";
import { cn } from "@/lib/utils";

function getProfileRaw(s: AdminStatus): Record<string, string> {
  const p = s.data?.profile;
  if (!p || typeof p !== "object") return {};
  return Object.fromEntries(
    Object.entries(p as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "string" ? v : String(v ?? ""),
    ])
  );
}

function parseFrDeadlineSortKey(frOrIso: string | undefined): number {
  if (!frOrIso?.trim()) return Number.POSITIVE_INFINITY;
  const dl = frOrIso.trim();
  let isoDate = dl;
  if (dl.includes("/")) {
    const parts = dl.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      isoDate = `${year}-${month}-${day}`;
    }
  }
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
}

function displayProfileValue(f: StatusFieldConfig, raw: string): string {
  const v = raw.trim();
  if (!v) return "—";
  if (f.key === "ape" || f.variant === "ape") {
    const d = formatApeDisplay(v);
    return d.trim() || "—";
  }
  if (f.key === "tvaRegime" || f.variant === "ae_vat_regime") {
    const d = formatAeVatRegimeDisplay(v);
    return d.trim() || "—";
  }
  return v;
}

function invoicePreviewLine(inv: Invoice): string {
  const bits: string[] = [];
  if (inv.number?.trim()) bits.push(`Fact. ${inv.number.trim()}`);
  if (inv.client?.trim()) bits.push(inv.client.trim());
  else if (inv.subject?.trim()) bits.push(inv.subject.trim());
  return bits.join(" — ") || "Facture sans titre";
}

/** Champs bancaires : visibles dans le formulaire, masqués sur la carte liste. */
const HIDDEN_STATUS_CARD_KEYS = new Set(["iban", "bic", "swift"]);

const ACTIVITY_ACCENTS = {
  demarches:
    "border-l-[3px] border-l-sky-400/70 bg-sky-500/[0.07] hover:bg-sky-500/[0.11] border-[rgba(245,245,245,0.1)]",
  factures:
    "border-l-[3px] border-l-fuchsia-400/65 bg-fuchsia-500/[0.07] hover:bg-fuchsia-500/[0.11] border-[rgba(245,245,245,0.1)]",
  contrats:
    "border-l-[3px] border-l-emerald-400/65 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.11] border-[rgba(245,245,245,0.1)]",
} as const;

function StatusActivityBlock({
  title,
  href,
  icon: Icon,
  lines,
  total,
  emptyHint,
  variant = "default",
  footnote,
  accent,
}: {
  title: string;
  href: string;
  icon: React.ElementType;
  lines: string[];
  total: number;
  emptyHint: string;
  variant?: "default" | "warn";
  footnote?: string;
  accent: keyof typeof ACTIVITY_ACCENTS;
}) {
  const has = total > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[5rem] flex-col rounded-xl border py-3 pl-3.5 pr-3 transition-colors",
        ACTIVITY_ACCENTS[accent],
        variant === "warn" && has && "ring-1 ring-amber-400/25 ring-inset"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/55">
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span className="leading-tight">{title}</span>
        </div>
        {has ? (
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              variant === "warn" ? "text-amber-300/95" : "text-[#F5F5F5]/50"
            )}
          >
            {total}
          </span>
        ) : null}
      </div>
      {has ? (
        <ul className="mt-2 flex-1 space-y-1">
          {lines.slice(0, 2).map((line, i) => (
            <li
              key={i}
              className="line-clamp-2 text-[12px] font-medium leading-snug text-[#F5F5F5]/85 group-hover:text-[#F5F5F5]"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] leading-snug text-[#F5F5F5]/36">{emptyHint}</p>
      )}
      {has && total > 2 ? (
        <p className="mt-auto pt-1.5 text-[10px] text-[#F5F5F5]/40">
          +{total - 2} autre{total - 2 > 1 ? "s" : ""}
        </p>
      ) : null}
      {footnote ? (
        <p className="mt-1 text-[10px] leading-snug text-[#F5F5F5]/30">{footnote}</p>
      ) : null}
    </Link>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

export function StatutsPage() {
  const posthog = usePostHog();
  const router = useRouter();

  const { statuses, setStatuses, setProcedures, procedures, loading, error } = useAdminData();
  const { invoices, setInvoices } = useIncomesData();
  const { contracts } = useContractsData();
  const [, setSelectedBillingStatusId] = useLocalStorage<string | null>(
    "incomes:selected-billing-status",
    null
  );
  const [pendingDelete, setPendingDelete] = useState<{ id: string; nom: string } | null>(null);

  // ── Aperçus démarches / factures par statut + contrats globaux ─────────────

  const proceduresPreviewByStatusId = useMemo(() => {
    const map = new Map<string, AdminProcedure[]>();
    for (const p of procedures) {
      if (p.status === "termine") continue;
      const sid = p.statutJuridiqueId;
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(p);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) => parseFrDeadlineSortKey(a.dateLimite) - parseFrDeadlineSortKey(b.dateLimite)
      );
    }
    return map;
  }, [procedures]);

  const overdueByStatusId = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const set = new Set<string>();
    for (const p of procedures) {
      if ((p as { status?: string }).status === "termine") continue;
      const sid = (p as { statutJuridiqueId?: string }).statutJuridiqueId;
      if (!sid) continue;
      const dl = (p as { dateLimite?: string }).dateLimite;
      if (!dl) continue;
      let isoDate = dl;
      if (dl.includes("/")) {
        const [day, month, year] = dl.split("/");
        isoDate = `${year}-${month}-${day}`;
      }
      const d = new Date(`${isoDate}T12:00:00`);
      if (!Number.isNaN(d.getTime()) && d < today) set.add(sid);
    }
    return set;
  }, [procedures]);

  const pendingInvoicesPreviewByStatusId = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      if (inv.status !== "en_attente") continue;
      const sid = inv.statutJuridiqueId;
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(inv);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) => parseFrDeadlineSortKey(a.dueDate) - parseFrDeadlineSortKey(b.dueDate)
      );
    }
    return map;
  }, [invoices]);

  /** Brouillon ou envoyé — pas encore signé (vue globale, pas de lien statut en base). */
  const inProgressContracts = useMemo(
    () => contracts.filter((c) => c.status === "draft" || c.status === "sent"),
    [contracts]
  );

  const contractPreviewLines = useMemo(
    () =>
      inProgressContracts.map((c) => {
        const t = c.title?.trim();
        return t && t.length > 0 ? t : "Sans titre";
      }),
    [inProgressContracts]
  );

  const sortedStatuses = useMemo(
    () =>
      [...statuses].sort((a, b) => {
        const aAct = a.actif !== false;
        const bAct = b.actif !== false;
        if (aAct !== bAct) return aAct ? -1 : 1;
        return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
      }),
    [statuses]
  );

  const activeCount = useMemo(() => statuses.filter((s) => s.actif !== false).length, [statuses]);

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger tes statuts juridiques"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_admin")}
      />
    );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const requestDeleteStatus = (id: string, nom: string) => setPendingDelete({ id, nom });

  const confirmDeleteStatus = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    const target = statuses.find((s) => s.id === id);

    const invoiceIdsToRemove = invoices
      .filter((inv) => inv.statutJuridiqueId === id)
      .map((inv) => inv.id);

    if (invoiceIdsToRemove.length > 0) {
      setInvoices((prev) => prev.filter((inv) => !invoiceIdsToRemove.includes(inv.id)));
    }

    const proceduresLinked = procedures.filter(
      (p) => (p as { statutJuridiqueId?: string }).statutJuridiqueId === id
    );
    if (proceduresLinked.length > 0) {
      const removeIds = new Set(proceduresLinked.map((p) => p.id));
      setProcedures((prev) => prev.filter((p) => !removeIds.has(p.id)));
    }

    setStatuses((prev) => prev.filter((s) => s.id !== id));
    setSelectedBillingStatusId((current) => (current === id ? null : current));

    posthog?.capture("status_deleted", {
      module: "admin",
      invoices_removed: invoiceIdsToRemove.length,
      procedures_removed: proceduresLinked.length,
    });

    try {
      await removeStatusLockedFolder(target);
    } catch {
      /* Non bloquant */
    }

    setPendingDelete(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes statuts</h1>
          <p className="text-sm text-muted-foreground">
            {statuses.length > 0
              ? `${statuses.length} statut${statuses.length > 1 ? "s" : ""} · ${activeCount} actif${activeCount > 1 ? "s" : ""}`
              : "Centralise ici tes situations administratives."}
          </p>
        </div>
        <Button className="shrink-0" asChild>
          <Link href="/admin/statuts/new">
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un statut
          </Link>
        </Button>
      </div>

      {/* Liste des fiches */}
      {statuses.length === 0 ? (
        <EmptyState
          icon={IdCard}
          title="Ajoute tes statuts"
          description="Intermittent, micro-entreprise, SACEM, SACD… Référence ici tes statuts pour garder une vue claire sur ta situation administrative et les connecter aux différents modules Sidekick."
          action={{ label: "Ajouter un statut", onClick: () => router.push("/admin/statuts/new") }}
        />
      ) : (
        <div className="space-y-4">
          {sortedStatuses.map((s) => {
            const isActive = s.actif !== false;
            const stype = s.type ?? "auto_entrepreneur";
            const profileRaw = getProfileRaw(s);
            const typeFields = STATUS_FIELDS[stype] ?? STATUS_FIELDS.auto_entrepreneur;
            const typeFieldsVisible = typeFields.filter((f) => !HIDDEN_STATUS_CARD_KEYS.has(f.key));
            const addressLines = formatStatusAddressLines(profileRaw);
            const hasAddress = addressLines.length > 0;
            const procList = proceduresPreviewByStatusId.get(s.id) ?? [];
            const procLines = procList.map((p) => p.label?.trim() || "Démarche sans titre");
            const invList = pendingInvoicesPreviewByStatusId.get(s.id) ?? [];
            const invLines = invList.map(invoicePreviewLine);
            const procCount = procList.length;
            const invoiceCount = invList.length;
            const contractCount = inProgressContracts.length;
            const hasAnyProfileData =
              hasAddress ||
              typeFieldsVisible.some((f) => (profileRaw[f.key] ?? "").trim() !== "");
            const showCompleteHint = !hasAnyProfileData;

            return (
              <Card
                key={s.id}
                className={cn(
                  "relative w-full overflow-hidden border transition-opacity",
                  isActive
                    ? "border-l-[3px] border-l-[#F0FF00]/50"
                    : "opacity-60"
                )}
              >
                <CardContent className="p-0">
                  {/* ── Header ── */}
                  <div className="flex flex-col gap-3 px-5 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold leading-snug tracking-tight">{s.nom}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px]">
                          {typeLabel(stype)}
                        </Badge>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F5F5F5]/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F5F5F5]/25" aria-hidden />
                            Inactif
                          </span>
                        )}
                      </div>
                      {(s.dateDebut || s.dateFin) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#F5F5F5]/55">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            {s.dateDebut ? (
                              <span>
                                Depuis le <span className="font-medium text-[#F5F5F5]/80">{s.dateDebut}</span>
                              </span>
                            ) : null}
                            {s.dateDebut && s.dateFin ? <span className="text-[#F5F5F5]/25">·</span> : null}
                            {s.dateFin ? (
                              <span>
                                Jusqu&apos;au <span className="font-medium text-[#F5F5F5]/80">{s.dateFin}</span>
                              </span>
                            ) : null}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1 self-start sm:pt-0.5">
                      <Button size="sm" variant="ghost" className="h-11 w-11 p-0" asChild>
                        <Link href={`/admin/statuts/${s.id}`} aria-label={`Modifier ${s.nom}`}>
                          <Pencil className="h-5 w-5" aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                        onClick={() => requestDeleteStatus(s.id, s.nom)}
                        aria-label={`Supprimer ${s.nom}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  {/* ── Adresse compacte + champs (hors coordonnées bancaires sur cette vue) ── */}
                  <div className="border-t border-[rgba(245,245,245,0.08)] px-5 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/38">
                      Informations enregistrées
                    </p>
                    {hasAddress ? (
                      <div className="mb-3 flex gap-2.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-2">
                        <MapPin
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5F5F5]/35"
                          aria-hidden
                        />
                        <address className="min-w-0 flex-1 not-italic text-[12px] leading-snug text-[#F5F5F5]/82">
                          {addressLines.map((ln, i) => (
                            <span key={i} className={cn("block", i > 0 && "mt-0.5")}>
                              {ln}
                            </span>
                          ))}
                        </address>
                      </div>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {typeFieldsVisible.map((f) => {
                        const raw = profileRaw[f.key] ?? "";
                        const shown = displayProfileValue(f, raw);
                        const isEmpty = shown === "—";
                        return (
                          <div key={f.key} className="min-w-0">
                            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
                              {f.label}
                              {f.advanced ? (
                                <span className="ml-1 font-normal normal-case text-[#F5F5F5]/28">
                                  (avancé)
                                </span>
                              ) : null}
                            </dt>
                            <dd
                              className={cn(
                                "mt-0.5 break-words text-[12px] font-medium leading-snug",
                                isEmpty ? "text-[#F5F5F5]/32" : "text-[#F5F5F5]/88"
                              )}
                              title={!isEmpty && raw.trim() ? raw : undefined}
                            >
                              {shown}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    {showCompleteHint ? (
                      <Link
                        href={`/admin/statuts/${s.id}`}
                        className="mt-3 inline-block text-xs text-[#F5F5F5]/40 underline underline-offset-2 transition-colors hover:text-[#F5F5F5]/65"
                      >
                        Compléter la fiche →
                      </Link>
                    ) : null}
                  </div>

                  {/* ── Démarches, factures, contrats (aperçu) ── */}
                  <div className="border-t border-[rgba(245,245,245,0.08)] px-5 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/38">
                      Activité liée
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                      <StatusActivityBlock
                        title="Démarches actives"
                        href={`/admin/demarches?statut=${encodeURIComponent(s.id)}`}
                        icon={ClipboardList}
                        lines={procLines}
                        total={procCount}
                        emptyHint="Aucune démarche en cours pour ce statut."
                        variant={overdueByStatusId.has(s.id) ? "warn" : "default"}
                        accent="demarches"
                      />
                      <StatusActivityBlock
                        title="Factures en attente"
                        href="/incomes/facturation"
                        icon={Receipt}
                        lines={invLines}
                        total={invoiceCount}
                        emptyHint="Aucune facture en attente rattachée."
                        variant={invoiceCount > 0 ? "warn" : "default"}
                        accent="factures"
                      />
                      <StatusActivityBlock
                        title="Contrats en cours"
                        href="/admin/contrats"
                        icon={FileSignature}
                        lines={contractPreviewLines}
                        total={contractCount}
                        emptyHint="Aucun contrat brouillon ou en signature."
                        footnote={
                          contractCount > 0
                            ? "Vue globale : les contrats ne sont pas encore filtrés par statut dans Sidekick."
                            : undefined
                        }
                        accent="contrats"
                      />
                    </div>
                  </div>

                  {/* ── Notes ── */}
                  {s.notes ? (
                    <div className="border-t border-[rgba(245,245,245,0.08)] px-5 py-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/38">
                        Notes
                      </p>
                      <p
                        className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-[#F5F5F5]/55"
                        title={s.notes}
                      >
                        {s.notes}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog suppression ── */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce statut ?</DialogTitle>
            <DialogDescription className="text-left text-[#F5F5F5]/70">
              Es-tu sûr ? Toutes les données liées au statut{" "}
              <span className="font-semibold text-[#F5F5F5]">
                &quot;{pendingDelete?.nom}&quot;
              </span>{" "}
              seront supprimées définitivement : factures associées, démarches rattachées, dossier
              Admin verrouillé et liaisons locales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteStatus()}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
