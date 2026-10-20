"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RawMetricRow } from "@/lib/metrics";
import { metricDef } from "@/lib/metrics";
import { formatDate, localDateStr } from "@/lib/stats";
import PlayerPhoto from "@/components/PlayerPhoto";

type PlayerRow = { Id: string; Name: string; Number?: string };
type TriviaResponseRow = { Player: string; QuestionId: string; Correct: string; Date: string };
// Returns the Monday of the week containing the given YYYY-MM-DD date, or "" on invalid input
function weekStart(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return "";
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function DailyDigest({
  players,
  metrics,
  triviaResponses = [],
}: {
  players: PlayerRow[];
  metrics: RawMetricRow[];
  triviaResponses?: TriviaResponseRow[];
}) {
  const today = localDateStr();

  const dates = useMemo(() => {
    const set = new Set<string>([today]);
    for (const m of metrics) set.add(formatDate(m.Date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [metrics, today]);

  const [selectedDate, setSelectedDate] = useState(today);

  const byPlayer = useMemo(() => {
    const map = new Map<string, RawMetricRow[]>();
    for (const m of metrics) {
      if (formatDate(m.Date) !== selectedDate) continue;
      if (!map.has(m.Player)) map.set(m.Player, []);
      map.get(m.Player)!.push(m);
    }
    return map;
  }, [metrics, selectedDate]);

  const triviaByPlayer = useMemo(() => {
    const map = new Map<string, TriviaResponseRow>();
    for (const r of triviaResponses) {
      if (formatDate(r.Date) === selectedDate) map.set(r.Player, r);
    }
    return map;
  }, [triviaResponses, selectedDate]);

  // Players who logged HomeworkComplete during the week containing selectedDate
  const hwCompletedSet = useMemo(() => {
    const week = weekStart(selectedDate);
    const set = new Set<string>();
    for (const m of metrics) {
      if (m.Metric === "HomeworkComplete" && weekStart(formatDate(m.Date)) === week) {
        set.add(String(m.Player).trim().toLowerCase());
      }
    }
    return set;
  }, [metrics, selectedDate]);

  const playersWithWork = players.filter((p) => (byPlayer.get(p.Name) || []).length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide">DAILY WORK</h2>
          <p className="text-white/50 text-sm mt-1">
            What the team is doing on their own — log your work and cheer each other on.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-white/50">Date</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {d === today ? `Today (${formatDate(d)})` : formatDate(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {playersWithWork.length === 0 ? (
        <p className="text-white/30 text-sm">No one has logged work for this day yet. Be the first!</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playersWithWork.map((player) => {
            const entries = byPlayer.get(player.Name) || [];
            return (
              <div key={player.Id} className="rounded-lg border border-white/10 p-4 flex flex-col gap-2">
                <Link
                  href={`/players?name=${encodeURIComponent(player.Name)}`}
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <PlayerPhoto name={player.Name} size={32} />
                  <span className="font-semibold text-sm">
                    {player.Number && (
                      <span className="text-accent font-mono mr-1">#{player.Number}</span>
                    )}
                    {player.Name}
                  </span>
                </Link>
                <ul className="flex flex-col gap-1 text-sm text-white/70">
                  {entries.map((m) => {
                    const def = metricDef(m.Metric);
                    const label = def?.label || m.Metric;
                    const isBoolean = def?.type === "boolean";
                    return (
                      <li key={m.Id} className="flex justify-between gap-2">
                        <span className="shrink-0">{label}</span>
                        {!isBoolean && <span className="font-mono text-white text-right break-all">{m.Value}</span>}
                        {isBoolean && <span className="text-green-400">✓</span>}
                      </li>
                    );
                  })}
                </ul>
                {(() => {
                  const trivia = triviaByPlayer.get(player.Name);
                  if (!trivia) return null;
                  const correct = trivia.Correct === "true" || trivia.Correct === "TRUE" || trivia.Correct === "yes";
                  return (
                    <div className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 border mt-1 ${correct ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-white/50"}`}>
                      <span>{correct ? "✓" : "✗"}</span>
                      <span className="font-semibold">Trivia</span>
                      <span className="text-white/40">{correct ? "Got it right" : "Missed it"}</span>
                    </div>
                  );
                })()}
                {hwCompletedSet.has(player.Name.trim().toLowerCase()) && (
                  <div className="flex items-center gap-2 text-xs rounded px-2 py-1.5 border mt-1 bg-accent/10 border-accent/20 text-accent">
                    <span>✓</span>
                    <span className="font-semibold">Homework</span>
                    <span className="text-white/40">All done this week</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
