"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { localDateStr } from "@/lib/stats";

type PlayerRow = { Name: string };

const ROUND_METRICS = [
  { key: "sprintTime", label: "Sprint Time", unit: "sec", inputMode: "decimal" as const },
  { key: "throwVelocity", label: "Throw Velocity", unit: "mph", inputMode: "decimal" as const },
];

export default function PracticeRoundEntry({ onSaved }: { onSaved?: () => void }) {
  const [players, setPlayers] = useState<string[]>([]);
  const [date, setDate] = useState(localDateStr());
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [roundsSaved, setRoundsSaved] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sheetsGet("players")
      .then((d) => {
        const rows = d as PlayerRow[];
        setPlayers(rows.map((p) => p.Name).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  function setValue(player: string, metric: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [player]: { ...(prev[player] ?? {}), [metric]: val },
    }));
  }

  async function handleSaveRound() {
    const entries: { date: string; player: string; metric: string; value: string }[] = [];

    for (const player of players) {
      for (const m of ROUND_METRICS) {
        const v = values[player]?.[m.key]?.trim();
        if (v) entries.push({ date, player, metric: m.key, value: v });
      }
    }

    if (!entries.length) {
      setStatus("Enter at least one value before saving.");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      await sheetsPost("bulkMetrics", { entries });
      const round = roundsSaved + 1;
      setRoundsSaved(round);
      setValues({});
      setStatus(`Round ${round} saved — ${entries.length} entries recorded.`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold tracking-wide">PRACTICE ROUND ENTRY</h2>
        <p className="text-white/50 text-sm mt-1">
          Enter stats for the whole team at once. Save after each round — leave blanks for players who didn&apos;t go.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm w-48">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      {roundsSaved > 0 && (
        <div className="text-xs rounded px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400">
          Round {roundsSaved} saved. Fill in below for Round {roundsSaved + 1}, or close when done.
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse min-w-[400px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 font-semibold text-white/50 text-xs uppercase tracking-wide w-40">
                Player
              </th>
              {ROUND_METRICS.map((m) => (
                <th key={m.key} className="text-left py-2 px-2 font-semibold text-xs uppercase tracking-wide text-accent">
                  {m.label}
                  <span className="text-white/30 font-normal ml-1">({m.unit})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player} className="border-b border-white/5">
                <td className="py-2 pr-4 text-white/80 text-sm">{player}</td>
                {ROUND_METRICS.map((m) => (
                  <td key={m.key} className="py-1.5 px-2">
                    <input
                      type="number"
                      inputMode={m.inputMode}
                      step="0.01"
                      value={values[player]?.[m.key] ?? ""}
                      onChange={(e) => setValue(player, m.key, e.target.value)}
                      placeholder="—"
                      className="bg-white/5 border border-white/10 rounded px-2 py-1.5 w-24 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSaveRound}
          disabled={submitting}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-5 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Saving..." : roundsSaved === 0 ? "Save Round 1" : `Save Round ${roundsSaved + 1}`}
        </button>
        {roundsSaved > 0 && (
          <button
            onClick={() => onSaved?.()}
            className="bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-sm px-5 py-2 rounded"
          >
            Done
          </button>
        )}
      </div>

      {status && <p className="text-sm text-white/70">{status}</p>}
    </div>
  );
}
