"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet } from "@/lib/sheets";
import { METRIC_DEFS } from "@/lib/metrics";
import { formatDate } from "@/lib/stats";
import type { RawMetricRow } from "@/lib/metrics";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string; Number?: string };

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getLongestStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort();
  let best = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const curr = new Date(sorted[i] + "T12:00:00");
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; best = Math.max(best, current); }
    else current = 1;
  }
  return best;
}

// Returns all YYYY-MM strings between two dates (inclusive)
function monthsBetween(from: string, to: string): string[] {
  const result: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    if (m === 12) { y++; m = 1; } else m++;
  }
  return result;
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth(ym: string): string { return `${ym}-01`; }
function lastOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function buildStats(metrics: RawMetricRow[], players: PlayerRow[], from: string, to: string) {
  const rangeMetrics = metrics.filter(m => {
    const d = formatDate(m.Date);
    return d >= from && d <= to;
  });

  const map = new Map<string, { dates: string[]; totals: Record<string, number>; activities: Record<string, number> }>();
  for (const p of players) map.set(p.Name, { dates: [], totals: {}, activities: {} });

  for (const m of rangeMetrics) {
    if (!map.has(m.Player)) map.set(m.Player, { dates: [], totals: {}, activities: {} });
    const s = map.get(m.Player)!;
    const d = formatDate(m.Date);
    if (!s.dates.includes(d)) s.dates.push(d);
    const def = METRIC_DEFS.find(md => md.key === m.Metric);
    if (!def) continue;
    if (def.type === "number") {
      s.totals[m.Metric] = (s.totals[m.Metric] || 0) + Number(m.Value);
    } else {
      if (m.Value === "true" || m.Value === "1" || m.Value === "yes") {
        s.activities[m.Metric] = (s.activities[m.Metric] || 0) + 1;
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, s]) => ({ name, daysLogged: s.dates.length, streak: getLongestStreak(s.dates), totals: s.totals, activities: s.activities }))
    .filter(p => p.daysLogged > 0)
    .sort((a, b) => b.daysLogged - a.daysLogged || b.streak - a.streak);
}

export default function MonthlyReportPage() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [fromDate, setFromDate] = useState(firstOfMonth(thisMonth));
  const [toDate, setToDate] = useState(lastOfMonth(thisMonth));
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [metrics, setMetrics] = useState<RawMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, m] = await Promise.all([
          sheetsGet("players") as Promise<PlayerRow[]>,
          sheetsGet("metrics") as Promise<RawMetricRow[]>,
        ]);
        setPlayers(p);
        setMetrics(m);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const months = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];
    return monthsBetween(fromDate.slice(0, 7), toDate.slice(0, 7));
  }, [fromDate, toDate]);

  const isMultiMonth = months.length > 1;

  const rangeLabel = useMemo(() => {
    if (!fromDate || !toDate) return "";
    const f = new Date(fromDate + "T12:00:00");
    const t = new Date(toDate + "T12:00:00");
    if (months.length === 1) {
      const [y, m] = months[0].split("-").map(Number);
      const first = firstOfMonth(months[0]);
      const last = lastOfMonth(months[0]);
      if (fromDate === first && toDate === last) return `${MONTH_NAMES[m - 1]} ${y}`;
    }
    return `${f.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [fromDate, toDate, months]);

  const playerStats = useMemo(() => buildStats(metrics, players, fromDate, toDate), [metrics, players, fromDate, toDate]);

  // Month-over-month: days logged per player per month
  const momData = useMemo(() => {
    if (!isMultiMonth) return null;
    return months.map(ym => {
      const start = fromDate > firstOfMonth(ym) ? fromDate : firstOfMonth(ym);
      const end = toDate < lastOfMonth(ym) ? toDate : lastOfMonth(ym);
      const stats = buildStats(metrics, players, start, end);
      return { ym, stats };
    });
  }, [isMultiMonth, months, metrics, players, fromDate, toDate]);

  // All player names that appear in mom data
  const momPlayers = useMemo(() => {
    if (!momData) return [];
    const names = new Set<string>();
    for (const { stats } of momData) for (const s of stats) names.add(s.name);
    return Array.from(names);
  }, [momData]);

  const hwByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of metrics) {
      const d = formatDate(m.Date);
      if (m.Metric === "HomeworkComplete" && d >= fromDate && d <= toDate) {
        const name = String(m.Player || "").trim();
        if (name) map.set(name, (map.get(name) || 0) + 1);
      }
    }
    return map;
  }, [metrics, fromDate, toDate]);

  const totalDaysInRange = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const f = new Date(fromDate + "T12:00:00");
    const t = new Date(toDate + "T12:00:00");
    return Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  }, [fromDate, toDate]);

  if (loading) return <LogoLoader />;
  if (error) return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
      <p className="font-semibold mb-1">Could not load data</p>
      <p className="text-white/70">{error}</p>
    </div>
  );

  const numberMetrics = METRIC_DEFS.filter(d => d.type === "number");
  const boolMetrics = METRIC_DEFS.filter(d => d.type === "boolean");

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto print:max-w-none print:gap-6">

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase">Report</h1>
          <p className="text-white/50 text-sm mt-1">Celebrating the work the team puts in every day.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-white/50">
          From
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/50">
          To
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={todayStr()}
            onChange={e => setToDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60"
          />
        </label>
        <div className="flex gap-2 pb-0.5 flex-wrap">
          {((): { label: string; from: string; to: string }[] => {
            const prevMonthYM = (() => {
              const [y, m] = thisMonth.split("-").map(Number);
              return m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
            })();
            const nMonthsAgo = (n: number) => {
              const d = new Date(now); d.setMonth(d.getMonth() - n);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
            };
            return [
              { label: "This month", from: firstOfMonth(thisMonth), to: lastOfMonth(thisMonth) },
              { label: "Last month", from: firstOfMonth(prevMonthYM), to: lastOfMonth(prevMonthYM) },
              { label: "Last 3 months", from: nMonthsAgo(2), to: lastOfMonth(thisMonth) },
              { label: "Last 6 months", from: nMonthsAgo(5), to: lastOfMonth(thisMonth) },
            ];
          })().map(preset => (
            <button
              key={preset.label}
              onClick={() => { setFromDate(preset.from); setToDate(preset.to); }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${fromDate === preset.from && toDate === preset.to ? "bg-accent/20 border-accent/40 text-accent" : "border-white/10 text-white/40 hover:text-white hover:border-white/20"}`}
            >{preset.label}</button>
          ))}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:flex print:flex-col print:gap-1 print:mb-4">
        <div className="text-3xl font-bold tracking-widest uppercase text-black">TriStar Baseball</div>
        <div className="text-xl font-semibold text-gray-600">{rangeLabel} — Work Report</div>
      </div>

      {playerStats.length === 0 ? (
        <div className="text-white/50 text-sm py-12 text-center">No work logged for {rangeLabel}.</div>
      ) : (
        <>
          {/* Consistency leaderboard */}
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-4 print:text-black">
              Consistency — Days Logged
            </h2>
            <div className="flex flex-col gap-3">
              {playerStats.map((p, i) => (
                <div key={p.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-yellow-400 print:text-yellow-600">★</span>}
                      <span className="font-semibold">{p.name}</span>
                      {p.streak >= 3 && (
                        <span className="text-xs text-white/50 print:text-gray-500">{p.streak}-day streak</span>
                      )}
                    </div>
                    <span className="tabular-nums font-bold">{p.daysLogged} / {totalDaysInRange}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 print:bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent print:bg-blue-600 transition-all"
                      style={{ width: `${(p.daysLogged / totalDaysInRange) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Month-over-month breakdown (multi-month only) */}
          {isMultiMonth && momData && (
            <section>
              <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-4 print:text-black">
                Month-over-Month — Days Logged
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 print:border-gray-300">
                      <th className="text-left py-2 pr-4 font-semibold text-white/60 print:text-gray-500">Player</th>
                      {momData.map(({ ym }) => {
                        const [y, m] = ym.split("-").map(Number);
                        return (
                          <th key={ym} className="text-right py-2 px-3 font-semibold text-white/60 print:text-gray-500 whitespace-nowrap">
                            {MONTH_SHORT[m - 1]} {y !== now.getFullYear() ? y : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {momPlayers.map(name => (
                      <tr key={name} className="border-b border-white/5 print:border-gray-100">
                        <td className="py-2 pr-4 font-semibold">{name}</td>
                        {momData.map(({ ym, stats }) => {
                          const s = stats.find(x => x.name === name);
                          const start = fromDate > firstOfMonth(ym) ? fromDate : firstOfMonth(ym);
                          const end = toDate < lastOfMonth(ym) ? toDate : lastOfMonth(ym);
                          const days = Math.round((new Date(end + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / 86400000) + 1;
                          return (
                            <td key={ym} className="py-2 px-3 text-right tabular-nums">
                              {s ? (
                                <span className="font-semibold">{s.daysLogged}<span className="text-white/30 print:text-gray-400">/{days}</span></span>
                              ) : (
                                <span className="text-white/20 print:text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Strength totals */}
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-4 print:text-black">
              Strength Totals
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-300">
                    <th className="text-left py-2 pr-4 font-semibold text-white/60 print:text-gray-500">Player</th>
                    {numberMetrics.map(md => (
                      <th key={md.key} className="text-right py-2 px-3 font-semibold text-white/60 print:text-gray-500">
                        {md.label}{md.unit ? ` (${md.unit})` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map(p => (
                    <tr key={p.name} className="border-b border-white/5 print:border-gray-100">
                      <td className="py-2 pr-4 font-semibold">{p.name}</td>
                      {numberMetrics.map(md => (
                        <td key={md.key} className="py-2 px-3 text-right tabular-nums">
                          {p.totals[md.key] ? p.totals[md.key].toLocaleString() : <span className="text-white/20 print:text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Activity counts */}
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-4 print:text-black">
              Activity Sessions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-300">
                    <th className="text-left py-2 pr-4 font-semibold text-white/60 print:text-gray-500">Player</th>
                    {boolMetrics.map(md => (
                      <th key={md.key} className="text-right py-2 px-3 font-semibold text-white/60 print:text-gray-500">
                        {md.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map(p => (
                    <tr key={p.name} className="border-b border-white/5 print:border-gray-100">
                      <td className="py-2 pr-4 font-semibold">{p.name}</td>
                      {boolMetrics.map(md => (
                        <td key={md.key} className="py-2 px-3 text-right tabular-nums">
                          {p.activities[md.key] ? (
                            <span className="font-semibold">{p.activities[md.key]}×</span>
                          ) : (
                            <span className="text-white/20 print:text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Streak callouts */}
          {playerStats.filter(p => p.streak >= 3).length > 0 && (
            <section className="border border-accent/30 rounded-lg p-4 print:border-gray-300">
              <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-3 print:text-black">
                Streak Recognition
              </h2>
              <div className="flex flex-col gap-2">
                {playerStats
                  .filter(p => p.streak >= 3)
                  .sort((a, b) => b.streak - a.streak)
                  .map(p => (
                    <div key={p.name} className="flex items-center gap-3 text-sm">
                      <span className="text-yellow-400 print:text-yellow-600">★</span>
                      <span>
                        <span className="font-bold">{p.name}</span>
                        <span className="text-white/60 print:text-gray-500"> — {p.streak} consecutive days of work</span>
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Homework completions */}
          {hwByPlayer.size > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-4 print:text-black">
                Homework Completed
              </h2>
              <div className="flex flex-col gap-2">
                {Array.from(hwByPlayer.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm border-b border-white/5 print:border-gray-100 py-1.5">
                      <span className="font-semibold">{name}</span>
                      <span className="tabular-nums text-accent font-bold">{count} week{count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Print footer */}
          <div className="hidden print:block text-xs text-gray-400 mt-8 border-t border-gray-200 pt-4">
            TriStar Baseball · {rangeLabel} · Generated {new Date().toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
}
