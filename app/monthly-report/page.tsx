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

export default function MonthlyReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
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

  const monthMetrics = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return metrics.filter((m) => formatDate(m.Date).startsWith(prefix));
  }, [metrics, year, month]);

  const playerStats = useMemo(() => {
    const map = new Map<string, {
      dates: string[];
      totals: Record<string, number>;
      activities: Record<string, number>;
    }>();

    for (const p of players) {
      map.set(p.Name, { dates: [], totals: {}, activities: {} });
    }

    for (const m of monthMetrics) {
      if (!map.has(m.Player)) map.set(m.Player, { dates: [], totals: {}, activities: {} });
      const s = map.get(m.Player)!;
      const d = formatDate(m.Date);
      if (!s.dates.includes(d)) s.dates.push(d);

      const def = METRIC_DEFS.find((md) => md.key === m.Metric);
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
      .map(([name, s]) => ({
        name,
        daysLogged: s.dates.length,
        streak: getLongestStreak(s.dates),
        totals: s.totals,
        activities: s.activities,
      }))
      .filter((p) => p.daysLogged > 0)
      .sort((a, b) => b.daysLogged - a.daysLogged || b.streak - a.streak);
  }, [monthMetrics, players]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDays = Math.max(...playerStats.map((p) => p.daysLogged), 1);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  if (loading) return <LogoLoader />;
  if (error) return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
      <p className="font-semibold mb-1">Could not load data</p>
      <p className="text-white/70">{error}</p>
    </div>
  );

  const numberMetrics = METRIC_DEFS.filter((d) => d.type === "number");
  const boolMetrics = METRIC_DEFS.filter((d) => d.type === "boolean");

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto print:max-w-none print:gap-6">

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase">Monthly Report</h1>
          <p className="text-white/50 text-sm mt-1">Celebrating the work the team puts in every day.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4 print:hidden">
        <button onClick={prevMonth} className="text-white/60 hover:text-white px-2 py-1 text-lg">‹</button>
        <span className="font-bold text-lg tracking-wide">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="text-white/60 hover:text-white px-2 py-1 text-lg">›</button>
      </div>

      {/* Print header (hidden on screen) */}
      <div className="hidden print:flex print:flex-col print:gap-1 print:mb-4">
        <div className="text-3xl font-bold tracking-widest uppercase text-black">TriStar Baseball</div>
        <div className="text-xl font-semibold text-gray-600">{MONTH_NAMES[month]} {year} — Monthly Work Report</div>
      </div>

      {playerStats.length === 0 ? (
        <div className="text-white/50 text-sm py-12 text-center">No work logged for {MONTH_NAMES[month]} {year}.</div>
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
                        <span className="text-xs text-white/50 print:text-gray-500">
                          {p.streak}-day streak
                        </span>
                      )}
                    </div>
                    <span className="tabular-nums font-bold">
                      {p.daysLogged} / {daysInMonth}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 print:bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent print:bg-blue-600 transition-all"
                      style={{ width: `${(p.daysLogged / daysInMonth) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                    {numberMetrics.map((md) => (
                      <th key={md.key} className="text-right py-2 px-3 font-semibold text-white/60 print:text-gray-500">
                        {md.label}{md.unit ? ` (${md.unit})` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p) => (
                    <tr key={p.name} className="border-b border-white/5 print:border-gray-100">
                      <td className="py-2 pr-4 font-semibold">{p.name}</td>
                      {numberMetrics.map((md) => (
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
                    {boolMetrics.map((md) => (
                      <th key={md.key} className="text-right py-2 px-3 font-semibold text-white/60 print:text-gray-500">
                        {md.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p) => (
                    <tr key={p.name} className="border-b border-white/5 print:border-gray-100">
                      <td className="py-2 pr-4 font-semibold">{p.name}</td>
                      {boolMetrics.map((md) => (
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
          {playerStats.filter((p) => p.streak >= 3).length > 0 && (
            <section className="border border-accent/30 rounded-lg p-4 print:border-gray-300">
              <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-3 print:text-black">
                Streak Recognition
              </h2>
              <div className="flex flex-col gap-2">
                {playerStats
                  .filter((p) => p.streak >= 3)
                  .sort((a, b) => b.streak - a.streak)
                  .map((p) => (
                    <div key={p.name} className="flex items-center gap-3 text-sm">
                      <span className="text-yellow-400 print:text-yellow-600">★</span>
                      <span>
                        <span className="font-bold">{p.name}</span>
                        <span className="text-white/60 print:text-gray-500">
                          {" "}— {p.streak} consecutive days of work
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Print footer */}
          <div className="hidden print:block text-xs text-gray-400 mt-8 border-t border-gray-200 pt-4">
            TriStar Baseball · {MONTH_NAMES[month]} {year} · Generated {new Date().toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
}
