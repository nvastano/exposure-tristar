"use client";

import { useMemo, useState } from "react";
import type { RawMetricRow } from "@/lib/metrics";
import { metricDef } from "@/lib/metrics";
import { formatDate, localDateStr } from "@/lib/stats";
import PlayerPhoto from "@/components/PlayerPhoto";

type PlayerRow = { Id: string; Name: string; Number?: string };

export default function DailyDigest({
  players,
  metrics,
}: {
  players: PlayerRow[];
  metrics: RawMetricRow[];
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

  const playersWithWork = players.filter((p) => (byPlayer.get(p.Name) || []).length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide">DAILY DIGEST</h2>
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
                <div className="flex items-center gap-2">
                  <PlayerPhoto name={player.Name} size={32} />
                  <span className="font-semibold text-sm">
                    {player.Number && (
                      <span className="text-accent font-mono mr-1">#{player.Number}</span>
                    )}
                    {player.Name}
                  </span>
                </div>
                <ul className="flex flex-col gap-1 text-sm text-white/70">
                  {entries.map((m) => {
                    const def = metricDef(m.Metric);
                    const label = def?.label || m.Metric;
                    const isBoolean = def?.type === "boolean";
                    return (
                      <li key={m.Id} className="flex justify-between">
                        <span>{label}</span>
                        {!isBoolean && <span className="font-mono text-white">{m.Value}</span>}
                        {isBoolean && <span className="text-green-400">✓</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
