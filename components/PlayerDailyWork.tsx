"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RawMetricRow } from "@/lib/metrics";
import { METRIC_DEFS, metricDef } from "@/lib/metrics";
import { formatDate } from "@/lib/stats";

export default function PlayerDailyWork({
  metrics,
  canEdit,
  onDelete,
}: {
  metrics: RawMetricRow[];
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  const numericCharts = useMemo(() => {
    const numericDefs = METRIC_DEFS.filter((def) => def.type === "number");
    return numericDefs
      .map((def) => {
        const rows = metrics
          .filter((m) => m.Metric === def.key)
          .map((m) => ({ date: formatDate(m.Date), value: Number(m.Value) }))
          .filter((r) => Number.isFinite(r.value))
          .sort((a, b) => a.date.localeCompare(b.date));
        return { def, rows };
      })
      .filter((c) => c.rows.length > 0);
  }, [metrics]);

  const byDate = useMemo(() => {
    const map = new Map<string, RawMetricRow[]>();
    for (const m of metrics) {
      const d = formatDate(m.Date);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [metrics]);

  if (metrics.length === 0) {
    return <p className="text-white/50 text-sm">No daily work logged yet for this player.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {numericCharts.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {numericCharts.map(({ def, rows }) => (
            <div key={def.key} className="rounded-lg border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white/70 mb-3">{def.label} trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rows}>
                  <CartesianGrid stroke="#ffffff1a" />
                  <XAxis dataKey="date" stroke="#ffffff66" fontSize={11} />
                  <YAxis stroke="#ffffff66" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #333" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#c8102e" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white/70">Daily work log</h3>
        {byDate.map(([date, entries]) => (
          <div key={date} className="rounded-lg border border-white/10 p-4 flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-accent">{date}</span>
            <div className="flex flex-wrap gap-2">
              {entries.map((m) => {
                const def = metricDef(m.Metric);
                const label = def?.label || m.Metric;
                const isBoolean = def?.type === "boolean";
                const text = isBoolean ? label : `${label}: ${m.Value}`;
                return (
                  <span
                    key={m.Id}
                    className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs"
                  >
                    {isBoolean && <span className="text-green-400">✓</span>}
                    <span>{text}</span>
                    {canEdit && (
                      <button
                        onClick={() => onDelete(m.Id)}
                        className="text-white/40 hover:text-accent ml-1"
                        aria-label="Delete entry"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
