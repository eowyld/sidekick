// src/modules/incomes/overview/components/YearlyComparison.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import { MODULE_COLORS, MODULE_LABELS, type YearBar } from "../types";

interface YearlyComparisonProps {
  data: YearBar[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function YearlyComparison({ data }: YearlyComparisonProps) {
  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Comparatif annuel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,245,245,0.08)" vertical={false} />
            <XAxis dataKey="year" stroke="rgba(245,245,245,0.5)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="rgba(245,245,245,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="facture" stackId="y" name={MODULE_LABELS.facture} fill={MODULE_COLORS.facture} maxBarSize={64} />
            <Bar dataKey="royalties" stackId="y" name={MODULE_LABELS.royalties} fill={MODULE_COLORS.royalties} maxBarSize={64} />
            <Bar dataKey="sacem" stackId="y" name={MODULE_LABELS.sacem} fill={MODULE_COLORS.sacem} maxBarSize={64} />
            <Bar dataKey="intermittence" stackId="y" name={MODULE_LABELS.intermittence} fill={MODULE_COLORS.intermittence} radius={[3, 3, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
