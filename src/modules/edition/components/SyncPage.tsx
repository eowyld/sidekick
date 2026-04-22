"use client";

import { useState } from "react";
import { useEditionData } from "@/hooks/useEditionData";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import type { Work, SyncData, Exploitant, PersonRole } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Music,
  Edit2,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Tv,
  Plus,
  X,
  Radio,
  Disc,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS = [
  "Happy", "Dark", "Tension", "Energetic", "Romantic", "Dramatic",
  "Melancholic", "Uplifting", "Mysterious", "Peaceful", "Aggressive",
  "Nostalgic", "Suspenseful", "Playful", "Epic", "Calm", "Intense",
  "Cheerful", "Sad", "Hopeful", "Cinematic", "Ambient", "Dynamic",
  "Ethereal", "Groovy", "Inspirational",
];

const THEME_OPTIONS = [
  "Publicité", "Film", "Série TV", "Documentaire", "Jeux vidéo", "Sport",
  "Mode", "Voyage", "Nature", "Action", "Romance", "Technologie",
  "Cuisine", "Enfants", "Corporate", "Luxe", "Aventure", "Science-Fiction",
  "Horreur", "Comédie",
];

const SYNC_STATUSES: {
  value: SyncData["status"];
  label: string;
  Icon: React.ElementType;
  activeClass: string;
}[] = [
  { value: "not-ready", label: "Non prête", Icon: AlertCircle, activeClass: "border-red-500 text-red-400" },
  { value: "to-prepare", label: "À préparer", Icon: Clock, activeClass: "border-orange-500 text-orange-400" },
  { value: "sync-ready", label: "Sync-ready", Icon: CheckCircle2, activeClass: "border-green-500 text-green-400" },
  { value: "exploited", label: "Exploitée", Icon: Tv, activeClass: "border-blue-500 text-blue-400" },
];

function getSyncStatusBadge(status: SyncData["status"]) {
  switch (status) {
    case "not-ready":
      return <Badge className="border-red-500/30 bg-red-500/20 text-red-400">Non prête</Badge>;
    case "to-prepare":
      return <Badge className="border-orange-500/30 bg-orange-500/20 text-orange-400">À préparer</Badge>;
    case "sync-ready":
      return <Badge className="border-green-500/30 bg-green-500/20 text-green-400">Sync-ready</Badge>;
    case "exploited":
      return <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">Exploitée</Badge>;
  }
}

function getExploitantStatusBadge(status: Exploitant["status"]) {
  switch (status) {
    case "sent":
      return <Badge className="border-yellow-500/30 bg-yellow-500/20 text-xs text-yellow-400">Envoyé</Badge>;
    case "discussing":
      return <Badge className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">En discussion</Badge>;
    case "accepted":
      return <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">Accepté</Badge>;
    case "refused":
      return <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-400">Refusé</Badge>;
    default:
      return null;
  }
}

function getProjectLabel(project: Exploitant["project"]) {
  const map: Record<string, string> = {
    film: "Film", serie: "Série", pub: "Pub",
    "jeu-video": "Jeu vidéo", media: "Média",
  };
  return map[project] ?? "—";
}

function createDefaultSyncData(workId: string): SyncData {
  return {
    workId,
    status: "not-ready",
    moods: [],
    tempo: "",
    pitchShort: "",
    usageContext: "",
    themes: [],
    privateLinks: [
      `https://private-listen.music/${Math.random().toString(36).slice(2, 10)}`,
    ],
    exploitants: [],
  };
}

export function SyncPage() {
  const { works: allWorks, syncMap, setSyncData, loading, error } = useEditionData();
  const syncWorks = allWorks.filter((w) =>
    w.exploitationTypes.includes("sync")
  );

  const getSyncData = (workId: string): SyncData => {
    const raw = syncMap[workId];
    if (!raw) return createDefaultSyncData(workId);
    return {
      ...createDefaultSyncData(workId),
      ...raw,
      exploitants: Array.isArray(raw.exploitants) ? raw.exploitants : [],
      privateLinks: Array.isArray(raw.privateLinks) ? raw.privateLinks : [],
      moods: Array.isArray(raw.moods) ? raw.moods : [],
      themes: Array.isArray(raw.themes) ? raw.themes : [],
    };
  };

  const saveSyncData = (s: SyncData) => {
    setSyncData(s);
  };

  // Edit modal
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [editSync, setEditSync] = useState<SyncData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Exploitants modal
  const [exWork, setExWork] = useState<Work | null>(null);
  const [exSync, setExSync] = useState<SyncData | null>(null);

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes données de synchronisation"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_edition")}
    />
  );

  const openEdit = (work: Work) => {
    setEditWork(work);
    setEditSync(getSyncData(work.id));
  };
  const closeEdit = () => { setEditWork(null); setEditSync(null); };

  const handleSaveSync = () => {
    if (!editSync) return;
    saveSyncData(editSync);
    closeEdit();
    toast.success("Informations de synchronisation enregistrées.");
  };

  const openExploitants = (work: Work) => {
    setExWork(work);
    setExSync(getSyncData(work.id));
  };
  const closeExploitants = () => { setExWork(null); setExSync(null); };

  const handleSaveExploitants = () => {
    if (!exSync) return;
    saveSyncData(exSync);
    closeExploitants();
    toast.success("Exploitants enregistrés.");
  };

  const generatePitch = async () => {
    if (!editSync || !editWork) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const moods = editSync.moods.slice(0, 3).join(", ") || "unique";
    const themes = editSync.themes.slice(0, 2).join(" et ") || "diverses utilisations";
    const pitch = `« ${editWork.title} » est une composition ${editWork.genre || "musicale"} au tempo ${editSync.tempo || "dynamique"}, dégageant une ambiance ${moods}. Idéale pour ${themes}, cette œuvre offre une palette sonore distinctive adaptée à la synchronisation audiovisuelle.`;
    setEditSync((p) => (p ? { ...p, pitchShort: pitch } : p));
    setIsGenerating(false);
    toast.success("Pitch généré.");
  };

  const exportPitch = (work: Work) => {
    const sync = getSyncData(work.id);
    const date = new Date().toLocaleDateString("fr-FR");
    const roleLabel = (role: PersonRole) => {
      switch (role) {
        case "author": return "Auteur";
        case "composer": return "Compositeur";
        case "arranger": return "Arrangeur";
        case "adapter": return "Adaptateur";
      }
    };
    const persons = work.persons
      .map((p) => {
        const fullName = [p.firstName, p.name].filter(Boolean).join(" ");
        const display = p.pseudonym ? `${fullName} (${p.pseudonym})` : fullName;
        return `• ${display} — ${p.roles.map(roleLabel).join(", ")}`;
      })
      .join("\n");
    const publisherNote = work.selfPublished ? "Auto-édité" : "";
    const links = sync.privateLinks.map((l, i) => `${i + 1}. ${l}`).join("\n");

    const content = `═══════════════════════════════════════════
FICHE SYNCHRONISATION - ${work.title.toUpperCase()}
═══════════════════════════════════════════

📋 INFORMATIONS GÉNÉRALES
━━━━━━━━━━━━━━━━━━━━━━━
${work.artistName ? `Artiste : ${work.artistName}\n` : ""}Titre : ${work.title}
Genre : ${work.genre || "—"}
Durée : ${work.duration || "—"}
ISWC : ${work.iswc || "—"}
Tempo : ${sync.tempo || "—"}
${publisherNote ? `Édition : ${publisherNote}` : ""}

👥 PERSONNES IMPLIQUÉES
━━━━━━━━━━━━━━━━━━━━━━━
${persons || "—"}

🎵 CARACTÉRISTIQUES MUSICALES
━━━━━━━━━━━━━━━━━━━━━━━
Moods : ${sync.moods.join(", ") || "—"}
Thématiques : ${sync.themes.join(", ") || "—"}

💬 PITCH
━━━━━━━━━━━━━━━━━━━━━━━
${sync.pitchShort || "—"}

🎯 CONTEXTE D'UTILISATION
━━━━━━━━━━━━━━━━━━━━━━━
${sync.usageContext || "—"}

🌍 TERRITOIRES DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━
${work.territories.join(", ") || "—"}

🔗 LIENS D'ÉCOUTE
━━━━━━━━━━━━━━━━━━━━━━━
${links || "—"}

═══════════════════════════════════════════
Document généré le ${date}
═══════════════════════════════════════════`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sync-${work.title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fiche exportée.");
  };

  const kpi = {
    total: syncWorks.length,
    exploited: syncWorks.filter((w) => getSyncData(w.id).status === "exploited").length,
    syncReady: syncWorks.filter((w) => getSyncData(w.id).status === "sync-ready").length,
    toPrepare: syncWorks.filter((w) => getSyncData(w.id).status === "to-prepare").length,
    notReady: syncWorks.filter((w) => getSyncData(w.id).status === "not-ready").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Synchronisation</h1>
        <p className="mt-1 text-sm text-[#F5F5F5]/60">
          Préparez vos œuvres pour la synchronisation audiovisuelle
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Seules les œuvres marquées avec le type d&apos;exploitation{" "}
          <span className="font-medium">Synchronisation</span> dans le catalogue
          apparaissent ici. Rendez-vous dans le{" "}
          <a href="/edition" className="underline hover:text-blue-200">
            Catalogue
          </a>{" "}
          pour activer ce type d&apos;exploitation sur une œuvre.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total sync", value: kpi.total, Icon: Music, color: "text-indigo-400" },
          { label: "Exploitées", value: kpi.exploited, Icon: Tv, color: "text-blue-400" },
          { label: "Sync-ready", value: kpi.syncReady, Icon: CheckCircle2, color: "text-green-400" },
          { label: "À préparer", value: kpi.toPrepare, Icon: Clock, color: "text-orange-400" },
          { label: "Non prêtes", value: kpi.notReady, Icon: AlertCircle, color: "text-red-400" },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={cn("h-8 w-8 opacity-60", color)} />
              <div>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-[#F5F5F5]/60">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {syncWorks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tv className="mx-auto mb-4 h-12 w-12 text-[#F5F5F5]/20" />
            <p className="mb-2 text-[#F5F5F5]/60">
              Aucune œuvre marquée pour la synchronisation.
            </p>
            <p className="text-sm text-[#F5F5F5]/40">
              Activez le type d&apos;exploitation{" "}
              <span className="font-medium">Synchronisation</span> dans le catalogue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {syncWorks.map((work) => {
            const sync = getSyncData(work.id);
            return (
              <Card key={work.id}>
                <CardContent className="p-5">
                  <div className="flex gap-5">
                    {/* Left */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{work.title}</h3>
                        {getSyncStatusBadge(sync.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-[#F5F5F5]/70">
                        {work.genre && <span>Genre : {work.genre}</span>}
                        {sync.tempo && <span>Tempo : {sync.tempo}</span>}
                      </div>

                      {sync.moods.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sync.moods.map((m) => (
                            <Badge key={m} variant="outline" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {sync.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sync.themes.map((t) => (
                            <Badge
                              key={t}
                              className="border-indigo-500/30 bg-indigo-500/20 text-xs text-indigo-300"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {sync.pitchShort && (
                        <div className="rounded-lg bg-[rgba(245,245,245,0.05)] px-3 py-2 text-sm italic text-[#F5F5F5]/70">
                          &ldquo;{sync.pitchShort}&rdquo;
                        </div>
                      )}

                      {work.territories.length > 0 && (
                        <p className="text-xs text-[#F5F5F5]/50">
                          Territoires : {work.territories.join(", ")}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(work)}
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5" /> Éditer infos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPitch(work)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" /> Exporter
                        </Button>
                      </div>
                    </div>

                    {/* Right: exploitants */}
                    <div className="w-80 shrink-0">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Exploitants</span>
                          {sync.exploitants.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {sync.exploitants.length}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openExploitants(work)}
                        >
                          Gérer
                        </Button>
                      </div>

                      {sync.exploitants.length === 0 ? (
                        <div
                          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] p-6 transition-colors hover:border-[rgba(245,245,245,0.3)]"
                          onClick={() => openExploitants(work)}
                        >
                          <Tv className="mb-2 h-6 w-6 text-[#F5F5F5]/30" />
                          <Button variant="ghost" size="xs">
                            <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sync.exploitants.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className="space-y-1 rounded-lg bg-[rgba(245,245,245,0.05)] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {e.company || "—"}
                                </span>
                                {getExploitantStatusBadge(e.status)}
                              </div>
                              <div className="flex gap-2 text-[#F5F5F5]/50">
                                {e.project && <span>{getProjectLabel(e.project)}</span>}
                                {e.date && <span>{e.date}</span>}
                              </div>
                            </div>
                          ))}
                          {sync.exploitants.length > 3 && (
                            <p className="text-center text-xs text-[#F5F5F5]/50">
                              +{sync.exploitants.length - 3} autre(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit sync modal */}
      {editSync && editWork && (
        <Dialog open onOpenChange={(o) => !o && closeEdit()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Préparer pour la synchronisation — {editWork.title}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {/* Statut */}
              <div>
                <Label className="mb-2 block">Statut Sync</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SYNC_STATUSES.map(({ value, label, Icon, activeClass }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setEditSync((p) => (p ? { ...p, status: value } : p))
                      }
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                        editSync.status === value
                          ? activeClass
                          : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:border-[rgba(245,245,245,0.3)]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Infos de base (read-only) */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-3">
                <div>
                  <Label className="text-xs text-[#F5F5F5]/50">Genre</Label>
                  <p className="text-sm">{editWork.genre || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-[#F5F5F5]/50">Territoires</Label>
                  <p className="text-sm">
                    {editWork.territories.join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* Droits d'auteur — répartition */}
              {editWork.persons.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: "DEP — Droits d'exécution publique", Icon: Radio, borderColor: "border-indigo-500/60", rep: editWork.depRepartition },
                    { label: "DRM — Droits de reproduction mécanique", Icon: Disc, borderColor: "border-amber-500/60", rep: editWork.drmRepartition },
                  ] as const).map(({ label, Icon, borderColor, rep }) => {
                    const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];
                    const roleLabel = (role: PersonRole) => {
                      switch (role) {
                        case "author": return "Auteur";
                        case "composer": return "Compositeur";
                        case "arranger": return "Arrangeur";
                        case "adapter": return "Adaptateur";
                      }
                    };
                    return (
                      <div key={label} className={cn("rounded-lg border-l-2 bg-[rgba(245,245,245,0.04)] p-3 space-y-2", borderColor)}>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-[#F5F5F5]/50" />
                          <p className="text-xs font-medium text-[#F5F5F5]/60 uppercase tracking-wide">{label}</p>
                        </div>
                        <div className="space-y-0.5 text-xs text-[#F5F5F5]/70">
                          <div className="flex justify-between"><span>Auteurs / Adaptateurs</span><span>{rep.authors}%</span></div>
                          <div className="flex justify-between"><span>Compositeurs / Arrangeurs</span><span>{rep.composers}%</span></div>
                          <div className="flex justify-between">
                            <span>{editWork.selfPublished ? "Auto-édition" : "Éditeurs"}</span>
                            <span>{rep.publishers}%</span>
                          </div>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full">
                          <div style={{ width: `${rep.authors}%`, backgroundColor: COLORS[0] }} />
                          <div style={{ width: `${rep.composers}%`, backgroundColor: COLORS[1] }} />
                          <div style={{ width: `${rep.publishers}%`, backgroundColor: "#eab308" }} />
                        </div>
                        <div className="space-y-0.5 pt-1">
                          {editWork.persons.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span>{[p.firstName, p.name].filter(Boolean).join(" ") || p.pseudonym}</span>
                                <span className="text-[#F5F5F5]/40">{p.roles.map(roleLabel).join(", ")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tempo */}
              <div className="space-y-1">
                <Label>Tempo</Label>
                <Input
                  value={editSync.tempo}
                  onChange={(e) =>
                    setEditSync((p) => p ? { ...p, tempo: e.target.value } : p)
                  }
                  placeholder="Ex: 120 BPM, Lent, Modéré, Rapide..."
                />
              </div>

              {/* Moods */}
              <div>
                <Label className="mb-2 block">Moods</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-[rgba(245,245,245,0.12)] p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_OPTIONS.map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() =>
                          setEditSync((p) => {
                            if (!p) return p;
                            return {
                              ...p,
                              moods: p.moods.includes(mood)
                                ? p.moods.filter((m) => m !== mood)
                                : [...p.moods, mood],
                            };
                          })
                        }
                        className={cn(
                          "rounded-full px-3 py-1 text-xs transition-colors",
                          editSync.moods.includes(mood)
                            ? "bg-indigo-600 text-white"
                            : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.15)]"
                        )}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Thématiques */}
              <div>
                <Label className="mb-2 block">Thématiques</Label>
                <div className="flex flex-wrap gap-1.5">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() =>
                        setEditSync((p) => {
                          if (!p) return p;
                          return {
                            ...p,
                            themes: p.themes.includes(theme)
                              ? p.themes.filter((t) => t !== theme)
                              : [...p.themes, theme],
                          };
                        })
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition-colors",
                        editSync.themes.includes(theme)
                          ? "bg-purple-600 text-white"
                          : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.15)]"
                      )}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Pitch court</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={generatePitch}
                    disabled={isGenerating}
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {isGenerating ? "Génération..." : "Générer avec IA"}
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={editSync.pitchShort}
                  onChange={(e) =>
                    setEditSync((p) => p ? { ...p, pitchShort: e.target.value } : p)
                  }
                  placeholder="Décrivez l'œuvre en quelques phrases..."
                />
              </div>

              {/* Contexte */}
              <div className="space-y-1">
                <Label>Contexte d&apos;utilisation idéal</Label>
                <Textarea
                  rows={3}
                  value={editSync.usageContext}
                  onChange={(e) =>
                    setEditSync((p) => p ? { ...p, usageContext: e.target.value } : p)
                  }
                  placeholder="Ex: Séquences d'action, scènes émotionnelles..."
                />
              </div>

              {/* Liens privés */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Liens d&apos;écoute privés</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setEditSync((p) =>
                        p ? { ...p, privateLinks: [...p.privateLinks, ""] } : p
                      )
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter un lien
                  </Button>
                </div>
                <div className="space-y-2">
                  {editSync.privateLinks.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={link}
                        onChange={(e) =>
                          setEditSync((p) => {
                            if (!p) return p;
                            const links = [...p.privateLinks];
                            links[i] = e.target.value;
                            return { ...p, privateLinks: links };
                          })
                        }
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditSync((p) =>
                            p
                              ? { ...p, privateLinks: p.privateLinks.filter((_, idx) => idx !== i) }
                              : p
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEdit}>
                Annuler
              </Button>
              <Button onClick={handleSaveSync}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Exploitants modal */}
      {exSync && exWork && (
        <Dialog open onOpenChange={(o) => !o && closeExploitants()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Gérer les exploitants — {exWork.title}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <Label>Exploitants ({exSync.exploitants.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExSync((p) =>
                      p
                        ? {
                            ...p,
                            exploitants: [
                              ...p.exploitants,
                              {
                                id: crypto.randomUUID(),
                                company: "",
                                project: "",
                                date: "",
                                status: "",
                                notes: "",
                              },
                            ],
                          }
                        : p
                    )
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Ajouter
                </Button>
              </div>

              {exSync.exploitants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] p-8 text-center">
                  <Tv className="mx-auto mb-2 h-8 w-8 text-[#F5F5F5]/20" />
                  <p className="text-sm text-[#F5F5F5]/50">
                    Aucun exploitant pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exSync.exploitants.map((exp, i) => (
                    <div
                      key={exp.id}
                      className="relative space-y-3 rounded-xl border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.03)] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-[#F5F5F5]/50">
                          Exploitant #{exp.id.slice(-4)}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setExSync((p) =>
                              p
                                ? { ...p, exploitants: p.exploitants.filter((_, idx) => idx !== i) }
                                : p
                            )
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Société *</Label>
                          <Input
                            value={exp.company}
                            onChange={(e) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, company: e.target.value };
                                return { ...p, exploitants: exps };
                              })
                            }
                            placeholder="Nom de la société"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type de projet *</Label>
                          <Select
                            value={exp.project}
                            onValueChange={(v) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, project: v as Exploitant["project"] };
                                return { ...p, exploitants: exps };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="film">Film</SelectItem>
                              <SelectItem value="serie">Série</SelectItem>
                              <SelectItem value="pub">Pub</SelectItem>
                              <SelectItem value="jeu-video">Jeu vidéo</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={exp.date}
                            onChange={(e) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, date: e.target.value };
                                return { ...p, exploitants: exps };
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Statut *</Label>
                          <Select
                            value={exp.status}
                            onValueChange={(v) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, status: v as Exploitant["status"] };
                                return { ...p, exploitants: exps };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sent">Envoyé</SelectItem>
                              <SelectItem value="discussing">En discussion</SelectItem>
                              <SelectItem value="accepted">Accepté</SelectItem>
                              <SelectItem value="refused">Refusé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          rows={2}
                          value={exp.notes}
                          onChange={(e) =>
                            setExSync((p) => {
                              if (!p) return p;
                              const exps = [...p.exploitants];
                              exps[i] = { ...exps[i]!, notes: e.target.value };
                              return { ...p, exploitants: exps };
                            })
                          }
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeExploitants}>
                Annuler
              </Button>
              <Button onClick={handleSaveExploitants}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
