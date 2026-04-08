"use client";
import type { Project } from "@/lib/sidekick-store";
interface WorkTrackLinkerProps { project: Project; }
export function WorkTrackLinker({ project }: WorkTrackLinkerProps) {
  return <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] p-5"><p className="text-[13px] text-[#F5F5F5]/30">Association oeuvre ↔ titre — à implémenter</p></div>;
}
