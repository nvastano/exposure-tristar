"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RawMetricRow } from "@/lib/metrics";
import { METRIC_CATEGORIES, METRIC_DEFS, metricDef } from "@/lib/metrics";
import { formatDate } from "@/lib/stats";

const BAR_COLORS = ["#c8102e", "#ffffff", "#4f9dff"];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toDateStr(d);
  });
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
  const numericDefs = METRIC_DEFS.filter((def) => def.type === "number");

  const allDates = useMemo(
    () => metrics.map((m) => formatDate(m.Date)).sort(),
    [metrics]
  );
  const latestMonday = useMemo(() => {
    const ref = allDates.length ? parseDate(allDates[allDates.length - 1]) : new Date();
    return mondayOf(ref);
  }, [allDates]);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(latestMonday);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [latestMonday, weekOffset]);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  const chartData = useMemo(() => {
    return days.map((date, i) => {
      const row: Record<string, string | number> = { day: DAY_LABELS[i] };
      for (const def of numericDefs) {
        const match = metrics.find((m) => formatDate(m.Date) === date && m.Metric === def.key);
        row[def.label] = match ? Number(match.Value) : 0;
      }
      return row;
    });
  }, [days, metrics, numericDefs]);

  const hasAnyNumericData = chartData.some((row) =>
    numericDefs.some((def) => Number(row[def.label]) > 0)
  );

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
      {numericDefs.length > 0 && (
        <div className="rounded-lg border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">
              Week of {days[0]} – {days[6]}
            </h3>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="text-white/50 hover:text-accent px-2"
                aria-label="Previous week"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
                disabled={weekOffset === 0}
                className="text-white/50 hover:text-accent px-2 disabled:opacity-20"
                aria-label="Next week"
              >
                Next ›
              </button>
            </div>
          </div>
          {hasAnyNumericData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#ffffff1a" />
                <XAxis dataKey="day" stroke="#ffffff66" fontSize={12} />
                <YAxis stroke="#ffffff66" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {numericDefs.map((def, i) => (
                  <Bar
                    key={def.key}
                    dataKey={def.label}
                    fill={BAR_COLORS[i % BAR_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/30 text-sm py-10 text-center">No strength stats logged this week.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white/70">Daily work log</h3>
        {byDate.map(([date, entries]) => (
          <DayLogCard key={date} date={date} entries={entries} canEdit={canEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function DayLogCard({
  date,
  entries,
  canEdit,
  onDelete,
}: {
  date: string;
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
    <div className="rounded-lg border border-white/10 p-4 flex flex-col gap-2 text-sm">
      <span className="text-xs font-semibold tracking-wide text-accent">{date}</span>

      {strength.length > 0 && (
        <Row label="Strength">
          {strength.map((m) => (
            <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
              {metricDef(m.Metric)?.label}: <span className="font-mono">{m.Value}</span>
            </Entry>
          ))}
        </Row>
      )}

      {byCategory.map(
        ({ category, rows }) =>
          rows.length > 0 && (
            <Row key={category} label={category}>
              {rows.map((m) => (
                <Entry key={m.Id} canEdit={canEdit} onDelete={() => onDelete(m.Id)}>
                  ✓ {metricDef(m.Metric)?.label}
                </Entry>
              ))}
            </Row>
          )
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
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-white/40 w-28 shrink-0">{label}</span>
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
    <div className="flex items-center gap-2 text-white/80">
      <span>{children}</span>
      {canEdit && (
        <button
          onClick={onDelete}
          className="text-white/30 hover:text-accent"
          aria-label="Delete entry"
          title="Delete"
        >
          ✕
        </button>
      )}
    </div>
  );
}
