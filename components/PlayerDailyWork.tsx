"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { RawMetricRow } from "@/lib/metrics";
import { METRIC_CATEGORIES, metricDef } from "@/lib/metrics";
import { formatDate } from "@/lib/stats";

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function currentStreak(sortedDates: string[]): number {
  if (!sortedDates.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = new Date(today);
  const dateSet = new Set(sortedDates);
  // allow today or yesterday as the most recent
  const latest = parseDate(sortedDates[sortedDates.length - 1]);
  const diffDays = Math.round((today.getTime() - latest.getTime()) / 86400000);
  if (diffDays > 1) return 0;
  if (diffDays === 1) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!dateSet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function daySummaryPills(entries: RawMetricRow[]): string[] {
  const pills: string[] = [];
  const hasStrength = entries.some((m) => metricDef(m.Metric)?.category === "Strength");
  const hasHitting = entries.some((m) => metricDef(m.Metric)?.category === "Hitting");
  const hasThrowing = entries.some((m) => metricDef(m.Metric)?.category === "Throwing/Defense");
  const drillCount = entries.filter((m) => m.Metric === "Drill").length;
  const hasOther = entries.some((m) => m.Metric === "Other");
  if (hasStrength) pills.push("Strength");
  if (hasHitting) pills.push("Hitting");
  if (hasThrowing) pills.push("Throwing");
  if (drillCount > 0) pills.push(`${drillCount} Drill${drillCount > 1 ? "s" : ""}`);
  if (hasOther) pills.push("Other");
  return pills;
}

export default function PlayerDailyWork({
  metrics,
  canEdit,
  onDelete,
}: {
  metrics: RawMetricRow[];
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, RawMetricRow[]>();
    for (const m of metrics) {
      const d = formatDate(m.Date);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [metrics]);

  const sortedDates = useMemo(() => byDate.map(([d]) => d).reverse(), [byDate]);

  const streak = useMemo(() => currentStreak(sortedDates), [sortedDates]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of metrics) {
      const cat = m.Metric === "Drill" ? "Drills" : m.Metric === "Other" ? "Other" : metricDef(m.Metric)?.category ?? "Other";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [metrics]);

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (metrics.length === 0) {
    return <p className="text-white/50 text-sm">No daily work logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/3 p-3 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums">{byDate.length}</p>
          <p className="text-xs text-white/40 mt-0.5">Days logged</p>
        </div>
        <div className={`rounded-lg border p-3 text-center ${streak > 0 ? "border-accent/40 bg-accent/5" : "border-white/10 bg-white/3"}`}>
          <p className={`text-2xl font-bold font-mono tabular-nums ${streak > 0 ? "text-accent" : ""}`}>{streak}</p>
          <p className="text-xs text-white/40 mt-0.5">Day streak</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/3 p-3 text-center">
          <p className="text-sm font-bold truncate">{topCategory ?? "—"}</p>
          <p className="text-xs text-white/40 mt-0.5">Top focus</p>
        </div>
      </div>

      {/* Activity log */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">Activity Log</h3>
        {byDate.map(([date, entries]) => {
          const expanded = expandedDate === date;
          const pills = daySummaryPills(entries);
          return (
            <div key={date} className="rounded-lg border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                onClick={() => setExpandedDate(expanded ? null : date)}
              >
                <span className="text-sm font-semibold text-white/80">{date}</span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {pills.map((p) => (
                    <span key={p} className="text-xs bg-white/10 text-white/60 rounded-full px-2 py-0.5">{p}</span>
                  ))}
                  <span className="text-white/30 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
                </div>
              </button>
              {expanded && (
                <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-2 text-sm">
                  <DayDetail entries={entries} canEdit={canEdit} onDelete={onDelete} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayDetail({
  entries,
  canEdit,
  onDelete,
}: {
  entries: RawMetricRow[];
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  const strength = entries.filter((m) => metricDef(m.Metric)?.category === "Strength");
  const byCategory = METRIC_CATEGORIES.filter((c) => c !== "Strength").map((category) => ({
    category,
    rows: entries.filter((m) => metricDef(m.Metric)?.category === category),
  }));
  const drills = entries.filter((m) => m.Metric === "Drill");
  const other = entries.filter((m) => m.Metric === "Other");

  return (
    <>
      {strength.length > 0 && (
        <Row label="Strength">
          {strength.map((m) => (
            <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
              {metricDef(m.Metric)?.label}: <span className="font-mono">{m.Value}</span>
            </Entry>
          ))}
        </Row>
      )}
      {byCategory.map(({ category, rows }) =>
        rows.length > 0 ? (
          <Row key={category} label={category}>
            {rows.map((m) => (
              <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
                ✓ {metricDef(m.Metric)?.label}
              </Entry>
            ))}
          </Row>
        ) : null
      )}
      {drills.length > 0 && (
        <Row label="Drills">
          {drills.map((m) => (
            <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
              {m.Value}
            </Entry>
          ))}
        </Row>
      )}
      {other.length > 0 && (
        <Row label="Other">
          {other.map((m) => (
            <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
              {m.Value}
            </Entry>
          ))}
        </Row>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-white/40 w-28 shrink-0 text-xs pt-0.5">{label}</span>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Entry({
  canEdit,
  onDelete,
  children,
}: {
  canEdit: boolean;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-white/80 text-sm">
      <span>{children}</span>
      {canEdit && (
        <button onClick={onDelete} className="text-white/30 hover:text-accent" aria-label="Delete">
          ✕
        </button>
      )}
    </div>
  );
}
