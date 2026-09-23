"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import { AlertTriangle, BookOpen, Disc3, Mic2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { useEditionAgreements } from "@/hooks/useEditionAgreements";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { LiveHeader, Segments } from "@/modules/live/components/shared/LiveUI";
import { todayISO } from "@/modules/live/lib/live-model";
import { isActiveAgreement, summarize } from "../lib/agreement-types";
import { undeclaredProgramDates, workLife } from "../lib/work-life";
import { lifecycleStep, needsAgreement } from "../lib/work-lifecycle";
import { personShortName } from "../lib/work-fields";
import { StepBadge } from "./work/LifecycleTrack";
import { WorkPanel } from "./WorkPanel";

const STALE_AGREEMENT_DAYS = 7;

/** Liste des œuvres (« Œuvres », pas « Catalogue » : ce nom-là est à Phono). Ce qui reste à faire d'abord, puis la liste. */
export function WorksPage() {
  const { works, setWorks, loading, error } = useEditionData();
  const { agreements } = useEditionAgreements();
  const { tracks } = usePhonoData();
  const { tourDates } = useLiveData();
  const { artistName } = useArtistIdentity();
  const { projects } = useProjectsData();
  const params = useSearchParams();
  const router = useRouter();
  const projectId = params.get("projectId");
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const remove = async (id: string, title: string) => {
    const ok = await confirm({
      title: `Supprimer « ${title || "cette œuvre"} » ?`,
      description: "L’œuvre, ses ayants droit et sa répartition seront définitivement supprimés.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    setWorks((prev) => prev.filter((w) => w.id !== id));
    setExpandedId(null);
    toast.success("Œuvre supprimée.");
  };
  const today = todayISO();

  const rows = useMemo(
    () =>
      works.map((work) => {
        const active = agreements.find((a) => a.workId === work.id && isActiveAgreement(a)) ?? null;
        const summary = active ? summarize(active) : null;
        const step = lifecycleStep(work, summary);
        const life = workLife(work, tracks, tourDates, artistName, today);
        const staleAgreement =
          !!active && active.status === "pending" && new Date(today).getTime() - new Date(active.createdAt.slice(0, 10)).getTime() > STALE_AGREEMENT_DAYS * 86_400_000;
        const todo =
          (EDITION_AGREEMENTS_OPEN && step === "draft" && needsAgreement(work)) ||
          step === "agreement-contested" ||
          life.releasedUndeclared ||
          life.undeclaredPrograms.length > 0;
        return { work, active, summary, step, life, staleAgreement, todo };
      }),
    [works, agreements, tracks, tourDates, artistName, today],
  );

  if (loading) return <PageLoader />;
  if (error) {
    return <PageError title="Impossible de charger tes œuvres" description="Vérifie ta connexion ou réessaie dans quelques instants." onRetry={() => mutate("user_edition")} />;
  }

  const inProject = project ? rows.filter((r) => project.linkedWorks.includes(r.work.id)) : rows;
  const counts = {
    all: inProject.length,
    todo: inProject.filter((r) => r.todo).length,
    agreement: inProject.filter((r) => r.step === "agreement-pending" || r.step === "agreement-contested").length,
    declared: inProject.filter((r) => r.step === "declared" || r.step === "accepted").length,
  };
  const shown = inProject
    .filter((r) =>
      filter === "todo" ? r.todo : filter === "agreement" ? r.step === "agreement-pending" || r.step === "agreement-contested" : filter === "declared" ? r.step === "declared" || r.step === "accepted" : true,
    )
    .filter((r) => r.work.title.toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR")));

  const releasedUndeclared = inProject.filter((r) => r.life.releasedUndeclared);
  const programs = undeclaredProgramDates(inProject.map((r) => r.work), tourDates, tracks, artistName, today);
  const contested = inProject.filter((r) => r.step === "agreement-contested");
  const stale = inProject.filter((r) => r.staleAgreement);
  const newHref = projectId ? `/edition/nouvelle?projectId=${encodeURIComponent(projectId)}` : "/edition/nouvelle";

  return (
    <div>
      {confirmDialog}
      <LiveHeader
        eyebrow="ÉDITION"
        title="Œuvres"
        description={
          EDITION_AGREEMENTS_OPEN
            ? "La répartition de chaque œuvre validée par tes co-auteurs, puis ce qu’elle devient : déclarée, enregistrée, jouée."
            : "Tes œuvres, leur répartition, et ce qu’elles deviennent : déclarées, enregistrées, jouées en concert."
        }
        actions={
          <Button asChild>
            <Link href={newHref}>
              <Plus size={14} className="mr-2" />
              Nouvelle œuvre
            </Link>
          </Button>
        }
      />

      {project && (
        <p className="mb-4 text-sm text-[#F5F5F5]/60">
          Œuvres du projet <span className="text-[#F5F5F5]">{project.title}</span> ·{" "}
          <Link href="/edition" className="text-[#F0FF00] hover:underline">
            voir toutes les œuvres
          </Link>
        </p>
      )}

      {(releasedUndeclared.length > 0 || programs.length > 0 || contested.length > 0 || stale.length > 0) && (
        <section aria-label="À faire" className="mb-6 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/[.05] px-5 py-4">
          {releasedUndeclared.length > 0 && (
            <AlertLine icon={Disc3}>
              {releasedUndeclared.length === 1 ? (
                <>
                  <WorkLink id={releasedUndeclared[0].work.id} title={releasedUndeclared[0].work.title} /> est sortie mais n’est pas déclarée à la SACEM : ses droits ne te sont pas reversés.
                </>
              ) : (
                <>{releasedUndeclared.length} œuvres sont sorties sans être déclarées à la SACEM : leurs droits ne te sont pas reversés.</>
              )}
            </AlertLine>
          )}
          {programs.length > 0 && (
            <AlertLine icon={Mic2}>
              {programs.length === 1 ? "1 concert joue" : `${programs.length} concerts jouent`} tes œuvres sans programme déclaré à la SACEM
              {programs.length === 1 && (
                <>
                  {" "}
                  (
                  <Link href={`/live/representations/${programs[0].id}`} className="underline hover:text-[#F0FF00]">
                    {programs[0].venue || programs[0].city}
                  </Link>
                  )
                </>
              )}
              .
            </AlertLine>
          )}
          {contested.map((r) => (
            <AlertLine key={r.work.id} icon={AlertTriangle}>
              Un co-auteur conteste la répartition de <WorkLink id={r.work.id} title={r.work.title} />.
            </AlertLine>
          ))}
          {stale.length > 0 && (
            <AlertLine icon={ShieldCheck}>
              {stale.length === 1 ? (
                <>
                  L’accord de <WorkLink id={stale[0].work.id} title={stale[0].work.title} /> attend des réponses depuis plus de {STALE_AGREEMENT_DAYS} jours.
                </>
              ) : (
                <>{stale.length} accords attendent des réponses depuis plus de {STALE_AGREEMENT_DAYS} jours.</>
              )}
            </AlertLine>
          )}
        </section>
      )}

      {inProject.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={project ? "Aucune œuvre dans ce projet" : "Tes œuvres commencent ici"}
          description={
            EDITION_AGREEMENTS_OPEN
              ? "Crée une œuvre, ajoute tes co-auteurs et envoie-leur la répartition : chacun la valide depuis un lien, sans compte. Tu verras ensuite où elle est déclarée, enregistrée et jouée."
              : "Crée une œuvre et ses ayants droit : SIDEKICK calcule les parts selon les clés SACEM, te prépare la déclaration et te signale quand un titre sorti ou un concert joué n’a pas été déclaré."
          }
          action={{ label: "Créer ma première œuvre", onClick: () => router.push(newHref) }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Segments
              value={filter}
              onChange={setFilter}
              items={[
                { id: "all", label: "Toutes", count: counts.all },
                { id: "todo", label: "À faire", count: counts.todo },
                ...(EDITION_AGREEMENTS_OPEN ? [{ id: "agreement", label: "Accord en cours", count: counts.agreement }] : []),
                { id: "declared", label: "Déclarées", count: counts.declared },
              ]}
            />
            <div className="w-full max-w-52">
              <Input aria-label="Rechercher une œuvre" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={BookOpen} title="Aucun résultat" description="Essaie un autre titre ou un autre filtre." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#F5F5F5]/[.08]">
              <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_150px_130px_150px] gap-4 border-b border-[#F5F5F5]/[.08] bg-[#F5F5F5]/[.02] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#F5F5F5]/40 md:grid">
                <span>Œuvre</span>
                <span>Ayants droit</span>
                <span>Étape</span>
                <span>Titres liés</span>
                <span>Concerts</span>
              </div>
              <ul className="divide-y divide-[#F5F5F5]/[.06]">
                {shown.map(({ work, summary, step, life }) =>
                  // Le panneau prend la place de sa ligne, comme dans Sessions
                  // Studio : le détail s'ouvre exactement là où on a cliqué.
                  expandedId === work.id ? (
                    <li key={work.id} className="bg-black/10 p-2">
                      <WorkPanel
                        work={work}
                        step={step}
                        life={life}
                        today={today}
                        onClose={() => setExpandedId(null)}
                        onDelete={() => void remove(work.id, work.title)}
                        onStatusChange={(status) => {
                          setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, status } : w)));
                          toast.success("Statut mis à jour.");
                        }}
                      />
                    </li>
                  ) : (
                  <li key={work.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(work.id)}
                      aria-expanded={false}
                      className="grid w-full gap-2 px-5 py-3.5 text-left transition-colors hover:bg-[#F5F5F5]/[.03] focus-visible:outline-[#F0FF00] md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_150px_130px_150px] md:items-center md:gap-4"
                    >
                      <span className="truncate text-sm font-medium">{work.title || "Sans titre"}</span>
                      <span className="truncate text-xs text-[#F5F5F5]/55">
                        {work.persons.length === 0 ? "—" : work.persons.map(personShortName).join(", ")}
                      </span>
                      <span>
                        <StepBadge step={step} agreement={summary} />
                      </span>
                      <span className="text-xs text-[#F5F5F5]/55">
                        {life.tracks.length === 0 ? "—" : `${life.tracks.length}${life.released.length ? ` · ${life.released.length} sorti${life.released.length > 1 ? "s" : ""}` : ""}`}
                        {life.releasedUndeclared && <span className="ml-1 text-amber-300">!</span>}
                      </span>
                      <span className="text-xs text-[#F5F5F5]/55">
                        {life.performances.length === 0 ? "—" : life.performances.length}
                        {life.undeclaredPrograms.length > 0 && <span className="ml-1 text-amber-300">({life.undeclaredPrograms.length} à déclarer)</span>}
                      </span>
                    </button>
                  </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertLine({ icon: Icon, children }: { icon: typeof Disc3; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-sm text-amber-100/90">
      <Icon size={15} className="mt-0.5 shrink-0 text-amber-300" />
      <span>{children}</span>
    </p>
  );
}

function WorkLink({ id, title }: { id: string; title: string }) {
  return (
    <Link href={`/edition/${id}`} className="font-medium underline decoration-amber-300/40 hover:text-[#F0FF00]">
      « {title || "Sans titre"} »
    </Link>
  );
}
