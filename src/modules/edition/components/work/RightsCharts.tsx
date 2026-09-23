"use client";

import type { RightsShare } from "../../lib/rights-shares";
import { formatPct } from "../../lib/sacem-keys";

function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => (d - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${endDeg - startDeg > 180 ? 1 : 0},1 ${x2},${y2} Z`;
}

function Donut({ values, size = 72 }: { values: { key: string; pct: number; color: string }[]; size?: number }) {
  const cx = size / 2;
  const r = size / 2 - 2;
  const hole = r * 0.55;
  const total = values.reduce((s, v) => s + v.pct, 0);
  if (!total) {
    return (
      <svg width={size} height={size} aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="rgba(245,245,245,0.06)" />
        <circle cx={cx} cy={cx} r={hole} fill="#101010" />
      </svg>
    );
  }
  let cursor = 0;
  const shown = values.filter((v) => v.pct > 0);
  return (
    <svg width={size} height={size} aria-hidden>
      {shown.length === 1 ? (
        <circle cx={cx} cy={cx} r={r} fill={shown[0].color} opacity={0.9} />
      ) : (
        shown.map((v) => {
          const sweep = (v.pct / total) * 360;
          const d = slicePath(cx, cx, r, cursor, cursor + sweep);
          cursor += sweep;
          return <path key={v.key} d={d} fill={v.color} opacity={0.9} />;
        })
      )}
      <circle cx={cx} cy={cx} r={hole} fill="#101010" />
    </svg>
  );
}

/** Deux donuts (DEP, DRM) et la légende par ayant droit, en pourcentage de l'œuvre entière. */
/** `compact` : donuts plus petits, à côté du tableau (panneau déplié de la liste des œuvres). */
export function RightsCharts({ shares, compact = false }: { shares: RightsShare[]; compact?: boolean }) {
  if (shares.length === 0) {
    return <p className="text-xs text-[#F5F5F5]/45">Ajoute un ayant droit pour voir la répartition.</p>;
  }
  return (
    <div className={compact ? "grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]" : "space-y-5"}>
      <div className={compact ? "flex gap-4" : "flex justify-center gap-8"}>
        {(["dep", "drm"] as const).map((kind) => (
          <div key={kind} className="flex flex-col items-center gap-1.5">
            <Donut size={compact ? 56 : 72} values={shares.map((s) => ({ key: s.key, pct: kind === "dep" ? s.depPct : s.drmPct, color: s.colorHex }))} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F5F5F5]/55">{kind.toUpperCase()}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[#F5F5F5]/40">
            <th className="pb-2 font-medium">Ayant droit</th>
            <th className="pb-2 text-right font-medium" title="Droits d'exécution publique">DEP</th>
            <th className="pb-2 text-right font-medium" title="Droits de reproduction mécanique">DRM</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((s) => (
            <tr key={s.key} className="border-t border-[#F5F5F5]/[.06]">
              <td className="py-1.5 pr-3">
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: s.colorHex }} />
                {s.label}
                {compact && s.detail && <span className="block pl-4 text-[11px] text-[#F5F5F5]/40">{s.detail}</span>}
              </td>
              <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{formatPct(s.depPct)}</td>
              <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{formatPct(s.drmPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
