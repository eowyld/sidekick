// src/modules/incomes/overview/components/ProjectBreakdown.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import { UNASSIGNED_PROJECT, type ProjectSlice } from "../types";

interface ProjectBreakdownProps {
  data: ProjectSlice[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function ProjectBreakdown({ data }: ProjectBreakdownProps) {
  const max = data.reduce((m, s) => Math.max(m, s.amount), 0);

  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Répartition par projet</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#F5F5F5]/40">Aucun revenu sur la période.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((s) => {
              const isUnassigned = s.projectId === UNASSIGNED_PROJECT;
              const width = max > 0 ? (s.amount / max) * 100 : 0;
              return (
                <li key={s.projectId} className="text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={isUnassigned ? "text-[#F5F5F5]/50" : "text-[#F5F5F5]/85"}>{s.label}</span>
                    <span className="tabular-nums text-[#F5F5F5]/60">{formatEUR(s.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(245,245,245,0.08)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        background: isUnassigned ? "rgba(245,245,245,0.3)" : "#F0FF00",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
