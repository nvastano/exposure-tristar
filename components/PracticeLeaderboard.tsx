"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Session } from "@/lib/stats";
import { formatDate } from "@/lib/stats";
import PlayerPhoto from "@/components/PlayerPhoto";

type PlayerRow = { Id: string; Name: string; Number?: string };

type LeaderboardRow = {
  player: PlayerRow;
  bestSprint: number | null;
  bestThrow: number | null;
};

export default function PracticeLeaderboard({
  players,
  byPlayer,
}: {
  players: PlayerRow[];
  byPlayer: Map<string, Session[]>;
}) {
  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const sessions of byPlayer.values()) {
      for (const s of sessions) set.add(s.date);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [byPlayer]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate ?? dates[0] ?? null;

  const rows: LeaderboardRow[] = useMemo(() => {
    if (!date) return [];
    return players.map((player) => {
      const sessions = (byPlayer.get(player.Name) || []).filter((s) => s.date === date);
      const sprintVals = sessions.map((s) => s.bestSprint).filter((n): n is number => n !== null);
      const throwVals = sessions.map((s) => s.bestThrow).filter((n): n is number => n !== null);
      return {
        player,
        bestSprint: sprintVals.length ? Math.min(...sprintVals) : null,
        bestThrow: throwVals.length ? Math.max(...throwVals) : null,
      };
    });
  }, [players, byPlayer, date]);

  const sprintChartData = rows
    .filter((r) => r.bestSprint !== null)
    .sort((a, b) => (a.bestSprint as number) - (b.bestSprint as number))
    .map((r) => ({ name: r.player.Name, value: r.bestSprint as number }));

  const throwChartData = rows
    .filter((r) => r.bestThrow !== null)
    .sort((a, b) => (b.bestThrow as number) - (a.bestThrow as number))
    .map((r) => ({ name: r.player.Name, value: r.bestThrow as number }));

  if (!date) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-wide">PRACTICE LEADERBOARD</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-white/50">Practice date</span>
          <select
            value={date}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="rounded-lg border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">
            Best sprint, home→1st (lower is better)
          </h3>
          {sprintChartData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, sprintChartData.length * 36)}>
              <BarChart data={sprintChartData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke="#ffffff1a" />
                <XAxis type="number" stroke="#ffffff66" fontSize={12} domain={[0, "auto"]} />
                <YAxis type="category" dataKey="name" stroke="#ffffff66" fontSize={12} width={110} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value) => [`${Number(value).toFixed(2)}s`, "Best sprint"]}
                />
                <Bar dataKey="value" fill="#c8102e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/30 text-sm">No sprint times logged for this practice.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">
            Best throw, 3rd→1st (higher is better)
          </h3>
          {throwChartData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, throwChartData.length * 36)}>
              <BarChart data={throwChartData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke="#ffffff1a" />
                <XAxis type="number" stroke="#ffffff66" fontSize={12} domain={[0, "auto"]} />
                <YAxis type="category" dataKey="name" stroke="#ffffff66" fontSize={12} width={110} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value) => [`${Number(value).toFixed(0)} mph`, "Best throw"]}
                />
                <Bar dataKey="value" fill="#ffffff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/30 text-sm">No throw velocities logged for this practice.</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left px-4 py-2">Player</th>
              <th className="text-left px-4 py-2">Best sprint (s)</th>
              <th className="text-left px-4 py-2">Best throw (mph)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player.Id} className="border-t border-white/10">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <PlayerPhoto name={r.player.Name} size={28} />
                    <span className="font-medium">
                      {r.player.Number && (
                        <span className="text-accent font-mono mr-1">#{r.player.Number}</span>
                      )}
                      {r.player.Name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono">
                  {r.bestSprint !== null ? r.bestSprint.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-2 font-mono">
                  {r.bestThrow !== null ? r.bestThrow.toFixed(0) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
