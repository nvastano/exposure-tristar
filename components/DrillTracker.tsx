"use client";

import { useMemo, useState } from "react";
import type { RawMetricRow } from "@/lib/metrics";
import type { RawDrillRow } from "@/lib/drills";

export default function DrillTracker({
  drills,
  metrics,
}: {
  drills: RawDrillRow[];
  metrics: RawMetricRow[];
}) {
  const [sortBy, setSortBy] = useState<"drill" | "total">("total");

  const { players, rows } = useMemo(() => {
    const drillEntries = metrics.filter((m) => m.Metric === "Drill");

    const playerSet = new Set<string>();
    for (const m of drillEntries) playerSet.add(m.Player);
    const players = Array.from(playerSet).sort((a, b) => a.localeCompare(b));

    // counts[drillName][player] = count
    const counts: Record<string, Record<string, number>> = {};
    for (const m of drillEntries) {
      if (!counts[m.Value]) counts[m.Value] = {};
      counts[m.Value][m.Player] = (counts[m.Value][m.Player] ?? 0) + 1;
    }

    // Build rows for every known drill (even those with 0 completions)
    const drillNames = drills.map((d) => d.Name);
    // Also include any drill names logged that may have been renamed/deleted
    for (const name of Object.keys(counts)) {
      if (!drillNames.includes(name)) drillNames.push(name);
    }

    const rows = drillNames.map((name) => {
      const byPlayer = counts[name] ?? {};
      const total = Object.values(byPlayer).reduce((s, n) => s + n, 0);
      return { name, byPlayer, total };
    });

    if (sortBy === "total") rows.sort((a, b) => b.total - a.total);
    else rows.sort((a, b) => a.name.localeCompare(b.name));

    return { players, rows };
  }, [drills, metrics, sortBy]);

  if (rows.length === 0) {
    return (
      <p className="text-white/30 text-sm">No drill completions logged yet.</p>
    );
  }

  const maxCount = Math.max(...rows.flatMap((r) => Object.values(r.byPlayer)), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span>Sort by:</span>
        <button
          onClick={() => setSortBy("total")}
          className={sortBy === "total" ? "text-accent font-semibold" : "hover:text-white"}
        >
          Most logged
        </button>
        <button
          onClick={() => setSortBy("drill")}
          className={sortBy === "drill" ? "text-accent font-semibold" : "hover:text-white"}
        >
          Drill name
        </button>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="text-sm border-collapse" style={{ minWidth: `${180 + players.length * 72}px` }}>
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 font-semibold text-white/50 text-xs uppercase tracking-wide w-44 sticky left-0 bg-black">
                Drill
              </th>
              {players.map((p) => (
                <th key={p} className="py-2 px-2 text-xs font-semibold text-white/50 text-center w-16 max-w-[72px]">
                  <span className="block truncate" title={p}>
                    {p.split(" ")[0]}
                  </span>
                </th>
              ))}
              <th className="py-2 px-2 text-xs font-semibold text-accent text-center w-16">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-white/5 hover:bg-white/3">
                <td className="py-2 pr-4 text-white/80 text-sm sticky left-0 bg-black">{row.name}</td>
                {players.map((p) => {
                  const count = row.byPlayer[p] ?? 0;
                  const intensity = count / maxCount;
                  return (
                    <td key={p} className="py-1.5 px-2 text-center">
                      {count > 0 ? (
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-xs font-mono font-semibold"
                          style={{
                            backgroundColor: `rgba(220,38,38,${0.15 + intensity * 0.5})`,
                            color: intensity > 0.5 ? "#fca5a5" : "#dc2626",
                          }}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-1.5 px-2 text-center font-mono text-sm font-semibold text-white/60">
                  {row.total || <span className="text-white/15">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
