// src/modules/dashboard/components/DashboardTodayList.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodayTask = {
  id: string;
  title: string;
  deadline: string | null; // ISO YYYY-MM-DD
};

type Props = {
  tasks: TodayTask[];
  today: string; // YYYY-MM-DD
};

function whenLabel(deadline: string | null, today: string): { text: string; urgent: boolean } {
  if (!deadline) return { text: "", urgent: false };
  if (deadline < today) return { text: "en retard", urgent: true };
  if (deadline === today) return { text: "aujourd'hui", urgent: true };
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().split("T")[0];
  if (deadline === tomorrowKey) return { text: "demain", urgent: false };
  // Sinon : libellé court
  const d = new Date(`${deadline}T00:00:00`);
  return {
    text: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    urgent: false,
  };
}

export function DashboardTodayList({ tasks, today }: Props) {
  const left = tasks.slice(0, Math.ceil(tasks.length / 2));
  const right = tasks.slice(Math.ceil(tasks.length / 2));

  const renderColumn = (col: TodayTask[]) => (
    <div>
      {col.map((task) => {
        const w = whenLabel(task.deadline, today);
        return (
          <div
            key={task.id}
            className="flex items-baseline gap-3 border-b border-[rgba(245,245,245,0.06)] py-2.5"
          >
            <span className="block h-[4px] w-[4px] shrink-0 -translate-y-0.5 rounded-full bg-[#F0FF00]/70" />
            <span className="flex-1 text-[14px] font-normal text-[#F5F5F5]">{task.title}</span>
            <span
              className={cn(
                "text-[11px] font-light",
                w.urgent ? "text-[#F0FF00]" : "text-[#F5F5F5]/45",
              )}
            >
              {w.text}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[9px] uppercase tracking-[0.22em] text-[#F5F5F5]/35">
          Aujourd'hui
        </h2>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
        >
          tout voir <ChevronRight size={12} />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[#F5F5F5]/30">
          Aucune tâche pour aujourd'hui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-16 md:grid-cols-2">
          {renderColumn(left)}
          {renderColumn(right)}
        </div>
      )}
    </section>
  );
}
