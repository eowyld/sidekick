import type { Album, Project, Track, Work } from "@/lib/sidekick-store";
import type { StudioSession } from "@/hooks/usePhonoData";
import type { RehearsalItem, TourDate } from "@/hooks/useLiveData";

export type CockpitSourceData = {
  tracks: Track[];
  albums: Album[];
  sessions: StudioSession[];
  works: Work[];
  tourDates: TourDate[];
  rehearsals: RehearsalItem[];
};

export type ProjectCockpit = {
  progress: number | null;
  phase: string;
  nextDate: { date: string; label: string } | null;
  alerts: string[];
  sectorProgress: Partial<Record<"phono" | "edition" | "live", number>>;
};

const RELEASE_RANK = { en_production: 1, mixe: 2, masterise: 3, publie: 5 } as const;

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return null;
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function releaseProgress(status: keyof typeof RELEASE_RANK, hasIsrc: boolean): number {
  const completed = RELEASE_RANK[status] + (hasIsrc ? 1 : 0);
  return Math.round((completed / 6) * 100);
}

export function buildProjectCockpit(project: Project, data: CockpitSourceData): ProjectCockpit {
  const tracks = data.tracks.filter((item) => project.linkedTracks.includes(item.id));
  const albums = data.albums.filter((item) => project.linkedAlbums.includes(item.id));
  const sessions = data.sessions.filter((item) => project.linkedSessions.includes(item.id));
  const works = data.works.filter((item) => project.linkedWorks.includes(item.id));
  const tourDates = data.tourDates.filter((item) => project.linkedTourDates.includes(String(item.id)));
  const rehearsals = data.rehearsals.filter((item) => project.linkedRehearsals.includes(item.id));
  const sectorProgress: ProjectCockpit["sectorProgress"] = {};
  const alerts: string[] = [];

  if (tracks.length || albums.length || sessions.length) {
    const releases = [
      ...tracks.map((item) => releaseProgress(item.status ?? "en_production", Boolean(item.isrc?.trim()))),
      ...albums.map((item) => Math.round((RELEASE_RANK[item.status] / 5) * 100)),
    ];
    sectorProgress.phono = releases.length ? average(releases) : sessions.length ? 20 : 0;
    const missingIsrc = tracks.filter((item) => !item.isrc?.trim()).length;
    if (missingIsrc) alerts.push(`${missingIsrc} titre${missingIsrc > 1 ? "s" : ""} sans ISRC`);
  }

  if (works.length) {
    const workScores = works.map((work) => {
      const statusScore = work.status === "in-progress" ? 0 : work.status === "finalized" ? 50 : 100;
      return Math.round(((project.manualMilestones.editionWritingCompositionDone ? 100 : 0) + statusScore) / 2);
    });
    sectorProgress.edition = average(workScores);
    const notDeposited = works.filter((work) => work.status === "in-progress" || work.status === "finalized").length;
    if (notDeposited) alerts.push(`${notDeposited} œuvre${notDeposited > 1 ? "s" : ""} à déposer`);
  }

  if (tourDates.length || rehearsals.length) {
    const creation = [
      project.manualMilestones.liveConceptDone,
      project.manualMilestones.liveSetlistDone,
      project.manualMilestones.liveTeamDone,
    ].filter(Boolean).length / 3;
    const rehearsed = rehearsals.length ? 1 : 0;
    const confirmed = tourDates.length ? tourDates.filter((date) => ["Signée", "Confirmée", "Finalisée", "Passée"].includes(date.status)).length / tourDates.length : 0;
    const played = tourDates.length ? tourDates.filter((date) => date.status === "Passée").length / tourDates.length : 0;
    sectorProgress.live = Math.round(((creation + rehearsed + confirmed + played) / 4) * 100);
    const tentative = tourDates.filter((date) => date.status === "En option").length;
    if (tentative) alerts.push(`${tentative} date${tentative > 1 ? "s" : ""} à confirmer`);
  }

  const scores = Object.values(sectorProgress);
  const progress = scores.length ? average(scores) : null;
  const candidates: Array<{ date: string; label: string; manual?: boolean }> = [];
  albums.forEach((item) => { const date = dateKey(item.releaseDate); if (date) candidates.push({ date, label: `Sortie de ${item.title}` }); });
  tracks.forEach((item) => { const date = dateKey(item.releaseDate); if (date) candidates.push({ date, label: `Sortie de ${item.title}` }); });
  tourDates.forEach((item) => { const date = dateKey(item.date); if (date) candidates.push({ date, label: `${item.venue || "Concert"} · ${item.city}` }); });
  sessions.forEach((item) => { const date = dateKey(item.date); if (date) candidates.push({ date, label: item.title || "Session studio" }); });
  rehearsals.forEach((item) => { const date = dateKey(item.date); if (date) candidates.push({ date, label: item.label || "Répétition" }); });
  (project.keyDates ?? []).forEach((item) => { const date = dateKey(item.date); if (date) candidates.push({ date, label: item.label }); });
  const today = dateKey(new Date().toISOString())!;
  let nextDate = candidates.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const fallback = dateKey(project.targetDate);
  if (!nextDate && fallback && fallback >= today) nextDate = { date: fallback, label: "Date cible", manual: true };
  if (!nextDate && project.status === "in_progress") alerts.push("Aucune échéance à venir");

  const phase = progress === null ? "À démarrer" : progress >= 100 ? "Finalisé" : progress >= 67 ? "Finalisation" : progress >= 34 ? "En développement" : "Lancement";
  return { progress, phase, nextDate, alerts, sectorProgress };
}
