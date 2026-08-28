import { useMemo } from "react";
import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TourStatus } from "@/modules/live/data/defaultRepresentations";
import { PIPELINE_ORDER } from "@/modules/live/data/statusMeta";
import { dateSortValue, isRepresentationPast } from "./dateHelpers";
import type { DateFilter, TourGroupVM } from "./types";

function normalizeText(v: string | undefined | null): string {
  return (v || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function useRepresentationsView(
  dates: TourDate[],
  projects: Project[],
  filter: DateFilter
) {
  // Index date.id (string) → projet
  const dateToProject = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      for (const key of p.linkedTourDates) {
        if (!map.has(key)) map.set(key, p);
      }
    }
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const arr = dates.filter((d) => {
      const past = isRepresentationPast(d.date);
      if (filter === "upcoming") return !past;
      if (filter === "past") return past;
      return true;
    });
    // À venir : ordre chronologique croissant ; passées : décroissant.
    return arr.sort((a, b) =>
      filter === "past"
        ? dateSortValue(b.date) - dateSortValue(a.date)
        : dateSortValue(a.date) - dateSortValue(b.date)
    );
  }, [dates, filter]);

  const stats = useMemo(() => {
    const segments = PIPELINE_ORDER.map((status) => ({
      status,
      count: filtered.filter((d) => d.status === status).length,
    })).filter((s) => s.count > 0);
    const cities = new Set(filtered.map((d) => normalizeText(d.city)).filter(Boolean)).size;
    return { total: filtered.length, segments, cities };
  }, [filtered]);

  const groups = useMemo<TourGroupVM[]>(() => {
    const byProject = new Map<string, TourDate[]>();
    const orphans: TourDate[] = [];
    for (const d of filtered) {
      const proj = dateToProject.get(String(d.id));
      if (proj) {
        const list = byProject.get(proj.id) ?? [];
        list.push(d);
        byProject.set(proj.id, list);
      } else {
        orphans.push(d);
      }
    }
    const projectGroups: TourGroupVM[] = [];
    for (const [projectId, groupDates] of byProject) {
      const project = projects.find((p) => p.id === projectId) ?? null;
      const status = Array.from(new Set(groupDates.map((d) => d.status))) as TourStatus[];
      projectGroups.push({ project, dates: groupDates, status });
    }
    // Trie les tournées par date la plus proche.
    projectGroups.sort(
      (a, b) => dateSortValue(a.dates[0]?.date ?? "") - dateSortValue(b.dates[0]?.date ?? "")
    );
    if (orphans.length > 0) {
      projectGroups.push({ project: null, dates: orphans, status: [] });
    }
    return projectGroups;
  }, [filtered, dateToProject, projects]);

  return { filtered, groups, stats, dateToProject };
}
