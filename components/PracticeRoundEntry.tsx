"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { localDateStr } from "@/lib/stats";

type PlayerRow = { Name: string };

export default function PracticeRoundEntry({
  date,
  onSaved,
}: {
  date: string;
  onSaved?: () => void;
}) {
  const [players, setPlayers] = useState<string[]>([]);
  const [sprintValues, setSprintValues] = useState<Record<string, string>>({});
  const [throwValues, setThrowValues] = useState<Record<string, string>>({});
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

  async function handleSaveRound() {
    const entries: { player: string; sprint: number | null; throw: number | null }[] = [];

    for (const player of players) {
      const s = parseFloat(sprintValues[player] ?? "");
      const t = parseFloat(throwValues[player] ?? "");
      const hasSprint = Number.isFinite(s) && s > 0;
      const hasThrow = Number.isFinite(t) && t > 0;
      if (hasSprint || hasThrow) {
        entries.push({ player, sprint: hasSprint ? s : null, throw: hasThrow ? t : null });
      }
    }

    if (!entries.length) {
      setStatus("Enter at least one value before saving.");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      await Promise.all(
        entries.map((e) =>
          sheetsPost("addEntry", {
            date,
            player: e.player,
            sprintTimes: e.sprint !== null ? [e.sprint] : [],
            throwVelos: e.throw !== null ? [e.throw] : [],
          })
        )
      );
      const round = roundsSaved + 1;
      setRoundsSaved(round);
      setSprintValues({});
      setThrowValues({});
      setStatus(`Round ${round} saved — ${entries.length} player${entries.length > 1 ? "s" : ""} recorded.`);
      onSaved?.();
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
          Fill in the whole team at once. Leave blanks for players who didn&apos;t go. Save after each round.
        </p>
        <p className="text-white/30 text-xs mt-1">Date: {date}</p>
      </div>

      {roundsSaved > 0 && (
        <div className="text-xs rounded px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400">
          Round {roundsSaved} saved. Fill in below for Round {roundsSaved + 1}, or close when done.
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse min-w-[380px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 font-semibold text-white/50 text-xs uppercase tracking-wide">
                Player
              </th>
              <th className="text-left py-2 px-2 font-semibold text-xs uppercase tracking-wide text-accent">
                Sprint Time <span className="text-white/30 font-normal">(s)</span>
              </th>
              <th className="text-left py-2 px-2 font-semibold text-xs uppercase tracking-wide text-accent">
                Throw Velo <span className="text-white/30 font-normal">(mph)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player} className="border-b border-white/5">
                <td className="py-2 pr-4 text-white/80 text-sm">{player}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={sprintValues[player] ?? ""}
                    onChange={(e) =>
                      setSprintValues((prev) => ({ ...prev, [player]: e.target.value }))
                    }
                    placeholder="—"
                    className="bg-white/5 border border-white/10 rounded px-2 py-1.5 w-20 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/50"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    value={throwValues[player] ?? ""}
                    onChange={(e) =>
                      setThrowValues((prev) => ({ ...prev, [player]: e.target.value }))
                    }
                    placeholder="—"
                    className="bg-white/5 border border-white/10 rounded px-2 py-1.5 w-20 text-sm placeholder:text-white/20 focus:outline-none focus:border-accent/50"
                  />
                </td>
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
          {submitting
            ? "Saving..."
            : roundsSaved === 0
            ? "Save Round 1"
            : `Save Round ${roundsSaved + 1}`}
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
