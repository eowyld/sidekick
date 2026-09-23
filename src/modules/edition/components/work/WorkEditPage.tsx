"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import { usePostHog } from "posthog-js/react";
import { BookOpen, PieChart, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Work } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEditionData } from "@/hooks/useEditionData";
import { useEditionAgreements } from "@/hooks/useEditionAgreements";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { selfPerson } from "@/lib/artist-identity";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import { LiveHeader, Panel, Segments, TextField } from "@/modules/live/components/shared/LiveUI";
import { todayISO } from "@/modules/live/lib/live-model";
import { isActiveAgreement, summarize } from "../../lib/agreement-types";
import { rightsShares, splitsValid } from "../../lib/rights-shares";
import { computeKey, hasExternalPublisher, toStoredRepartition } from "../../lib/sacem-keys";
import { DEFAULT_WORK } from "../../lib/work-fields";
import { lifecycleStep } from "../../lib/work-lifecycle";
import { AgreementPanel, guessOwner } from "./AgreementPanel";
import { DeclarationTab } from "./DeclarationTab";
import { LifecycleTrack } from "./LifecycleTrack";
import { StatusSwitch } from "./StatusSwitch";
import { LifeTab } from "./LifeTab";
import { RightsCharts } from "./RightsCharts";
import { RightsEditor } from "./RightsEditor";

type Draft = Omit<Work, "id">;

function withoutId(work: Work): Draft {
  const { id: _id, ...rest } = work;
  void _id;
  return rest;
}

/** Fiche d'une œuvre : `/edition/nouvelle` (id `null`) ou `/edition/[id]`. */
export function WorkEditPage({ id }: { id: string | null }) {
  const { works, loading } = useEditionData();
  const identity = useArtistIdentity();
  const [newId] = useState(() => crypto.randomUUID());

  if (loading || (!id && !identity.ready)) return <PageLoader />;
  const stored = id ? works.find((w) => w.id === id) : undefined;
  if (id && !stored) {
    return <PageError title="Œuvre introuvable" description="Cette œuvre a peut-être été supprimée." onRetry={() => mutate("user_edition")} />;
  }

  // Une œuvre se déclare sous l'identité civile de ses auteurs (CLAUDE.md,
  // « Identité de l'artiste », règle 3) : nom civil, et l'utilisateur d'office
  // comme ayant droit, retirable.
  const self = stored ? null : selfPerson(identity.legal, identity.identityMode, identity.artistName);
  const initial: Draft = stored
    ? withoutId(stored)
    : { ...DEFAULT_WORK, artistName: identity.legal.full, persons: self ? [self] : [] };

  return <WorkForm key={id ?? "new"} workId={id ?? newId} isNew={!id} initial={initial} />;
}

function WorkForm({ workId, isNew, initial }: { workId: string; isNew: boolean; initial: Draft }) {
  const router = useRouter();
  const params = useSearchParams();
  const posthog = usePostHog();
  const { works, setWorks } = useEditionData();
  const { agreements } = useEditionAgreements();
  const { legal, artistName } = useArtistIdentity();
  const { projects, patchProjectLinks } = useProjectsData();
  const { confirm, confirmDialog } = useConfirm();

  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [saved, setSaved] = useState(!isNew);
  const [tab, setTab] = useState("rights");
  const dirty = JSON.stringify(draft) !== baseline;
  useUnsavedChangesGuard(dirty);

  const stored = works.find((w) => w.id === workId);
  const workAgreements = useMemo(() => agreements.filter((a) => a.workId === workId), [agreements, workId]);
  const active = workAgreements.find(isActiveAgreement) ?? null;
  const summary = active ? summarize(active) : null;
  const step = lifecycleStep(draft, summary);
  const shares = rightsShares(draft);
  const today = todayISO();

  const save = () => {
    if (!draft.title.trim()) {
      toast.error("Donne un titre à l’œuvre.");
      return;
    }
    if (draft.persons.length === 0) {
      toast.error("Ajoute au moins un ayant droit.");
      return;
    }
    if (!splitsValid(draft)) {
      toast.error("Les parts de chaque catégorie doivent totaliser 100 %.");
      return;
    }
    const hasPublisher = hasExternalPublisher(draft);
    const next: Work = {
      ...draft,
      title: draft.title.trim(),
      id: workId,
      depRepartition: toStoredRepartition(computeKey("dep", draft.persons, hasPublisher)),
      drmRepartition: toStoredRepartition(computeKey("drm", draft.persons, hasPublisher)),
      // Les enregistrements liés s'écrivent depuis l'onglet « Vie de l'œuvre »,
      // hors brouillon : on garde la version en base.
      linkedTrackIds: stored?.linkedTrackIds ?? draft.linkedTrackIds ?? [],
    };
    if (saved) {
      setWorks((prev) => prev.map((w) => (w.id === workId ? next : w)));
      toast.success(`« ${next.title} » enregistrée.`);
    } else {
      setWorks((prev) => [next, ...prev]);
      const projectId = params.get("projectId");
      const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
      if (project) patchProjectLinks(project.id, { linkedWorks: [...new Set([...project.linkedWorks, workId])] });
      posthog?.capture("work_created", { module: "edition" });
      posthog?.capture("item_created", { module: "edition" });
      toast.success(`« ${next.title} » ajoutée à tes œuvres.`);
      setSaved(true);
      router.replace(`/edition/${workId}`);
    }
    const rest = withoutId(next);
    setDraft(rest);
    setBaseline(JSON.stringify(rest));
  };

  // Le statut s'enregistre au clic, sans attendre « Enregistrer » : c'est un
  // geste d'avancement, pas une saisie. Le reste du brouillon n'est pas touché.
  const changeStatus = (status: Work["status"]) => {
    setDraft((p) => ({ ...p, status }));
    if (!saved) return;
    setWorks((prev) => prev.map((w) => (w.id === workId ? { ...w, status } : w)));
    setBaseline((b) => JSON.stringify({ ...(JSON.parse(b) as Draft), status }));
    toast.success("Statut mis à jour.");
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Supprimer « ${draft.title || "cette œuvre"} » ?`,
      description: "L’œuvre, ses ayants droit, sa répartition et ses accords seront définitivement supprimés.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    setBaseline(JSON.stringify(draft));
    setWorks((prev) => prev.filter((w) => w.id !== workId));
    toast.success("Œuvre supprimée.");
    router.push("/edition");
  };

  return (
    <div>
      {confirmDialog}
      <LiveHeader
        eyebrow="ÉDITION"
        back="/edition"
        title={draft.title || "Nouvelle œuvre"}
        actions={
          <>
            {saved && (
              <Button variant="ghost" onClick={() => void remove()} aria-label="Supprimer l'œuvre">
                <Trash2 size={14} />
              </Button>
            )}
            <Button onClick={save} disabled={saved && !dirty}>
              <Save size={14} className="mr-2" />
              {saved ? (dirty ? "Enregistrer" : "Enregistrée") : "Créer l’œuvre"}
            </Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#F5F5F5]/[.08] bg-[rgba(44,44,46,.45)] px-5 py-4">
        {/* Sans l'accord, la frise répète les trois positions du sélecteur : on ne garde que lui. */}
        {EDITION_AGREEMENTS_OPEN ? (
          <LifecycleTrack step={step} work={draft} agreement={summary} />
        ) : (
          <p className="text-xs font-medium text-[#F5F5F5]/60">Statut de déclaration</p>
        )}
        <StatusSwitch status={draft.status} onChange={changeStatus} />
      </div>
      <div className="mb-5">
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { id: "rights", label: EDITION_AGREEMENTS_OPEN ? "Ayants droit & accord" : "Ayants droit" },
            { id: "declaration", label: "Déclaration" },
            { id: "life", label: "Vie de l’œuvre", disabledHint: saved ? undefined : "Crée l’œuvre pour accéder à cette partie" },
          ]}
        />
      </div>

      {tab === "rights" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Panel title="L’œuvre" icon={BookOpen}>
              <TextField label="Titre" required value={draft.title} onChange={(title) => setDraft((p) => ({ ...p, title }))} placeholder="Titre de l’œuvre" />
            </Panel>
            <Panel
              title="Ayants droit"
              icon={Users}
              color="#38BDF8"
              description={active ? "Figés par l’accord en cours. « Modifier la répartition » pour les changer." : "Auteurs, compositeurs, arrangeurs, et l’éditeur s’il y en a un."}
            >
              <RightsEditor work={draft} onChange={setDraft} locked={!!active} />
            </Panel>
            {EDITION_AGREEMENTS_OPEN && (
              <Panel title="Accord entre co-auteurs" icon={ShieldCheck} color="#F59E0B">
                {saved ? (
                  <AgreementPanel
                    workId={workId}
                    work={draft}
                    dirty={dirty}
                    agreements={workAgreements}
                    defaultOwnerId={guessOwner(draft.persons, legal.full, artistName)}
                  />
                ) : (
                  <p className="text-sm text-[#F5F5F5]/55">Crée l’œuvre, puis envoie l’accord à tes co-auteurs : chacun valide sa part depuis un lien personnel, sans compte.</p>
                )}
              </Panel>
            )}
          </div>
          <Panel title="Répartition" icon={PieChart} color="#A78BFA" description="Clés SACEM calculées selon les rôles et la présence d’un éditeur. En pourcentage de l’œuvre entière.">
            <RightsCharts shares={shares} />
          </Panel>
        </div>
      )}
      {tab === "declaration" && <DeclarationTab work={draft} onChange={setDraft} agreement={active ?? workAgreements[0] ?? null} />}
      {tab === "life" && stored && <LifeTab work={stored} artistName={artistName} today={today} />}
    </div>
  );
}
