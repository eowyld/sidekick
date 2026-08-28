"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { OverviewTab } from "./tabs/OverviewTab";
import { CreationTab } from "./tabs/CreationTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { MarketingTab } from "./tabs/MarketingTab";
import { AdminTab } from "./tabs/AdminTab";

const TABS = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "creation", label: "Artistique" },
  { key: "budget", label: "Budget" },
  { key: "marketing", label: "Campagne marketing" },
  { key: "admin", label: "Admin" },
];

export function ProjectTabs({ project }: { project: Project }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("tab") ?? "overview";

  const visibleTabs = TABS.filter((t) => t.key !== "creation" || project.sectors.length > 0);

  const goTab = (tab: string) =>
    router.replace(`/projects/${project.id}?tab=${tab}`, { scroll: false });

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-[rgba(245,245,245,0.1)]">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => goTab(t.key)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? "border-[#F0FF00] text-[#F5F5F5]"
                : "border-transparent text-[#F5F5F5]/40 hover:text-[#F5F5F5]/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "overview" && <OverviewTab project={project} onGoTab={goTab} />}
      {active === "creation" && <CreationTab project={project} />}
      {active === "budget" && <BudgetTab project={project} />}
      {active === "marketing" && <MarketingTab project={project} />}
      {active === "admin" && <AdminTab project={project} />}
    </div>
  );
}
