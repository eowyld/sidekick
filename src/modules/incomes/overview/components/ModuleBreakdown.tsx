// src/modules/incomes/overview/components/ModuleBreakdown.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import type { ModuleSlice } from "../types";

interface ModuleBreakdownProps {
  data: ModuleSlice[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function ModuleBreakdown({ data }: ModuleBreakdownProps) {
  const slices = data.filter((s) => s.amount > 0);

  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Répartition par module</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie data={slices} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
                {slices.map((s) => (
                  <Cell key={s.module} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,20,0.95)",
                  border: "1px solid rgba(245,245,245,0.14)",
                  borderRadius: 10,
                  color: "#f5f5f5",
                  fontSize: 12,
                }}
                formatter={(value: number | undefined) => formatEUR(value ?? 0)}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-2">
            {data.map((s) => (
              <li key={s.module} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-[#F5F5F5]/80">{s.label}</span>
                <span className="ml-auto tabular-nums text-[#F5F5F5]/60">{s.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
