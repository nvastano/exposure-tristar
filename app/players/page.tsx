"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sheetsGet } from "@/lib/sheets";
import { normalizeSessions } from "@/lib/stats";
import type { RawEntryRow, Session } from "@/lib/stats";
import PlayerCharts from "./PlayerCharts";

function PlayerContent() {
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") || "";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(playerName));

  useEffect(() => {
    if (!playerName) return;
    (async () => {
      try {
        const entries = (await sheetsGet("entries", { player: playerName })) as RawEntryRow[];
        setSessions(normalizeSessions(entries));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [playerName]);

  if (!playerName) {
    return <p className="text-white/50 text-sm">No player selected.</p>;
  }

  if (loading) {
    return <p className="text-white/50 text-sm">Loading...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
        <p className="font-semibold mb-1">Sheet not connected yet</p>
        <p className="text-white/70">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">{playerName}</h1>
        <p className="text-white/50 text-sm mt-1">Week-over-week progress</p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-white/50 text-sm">No sessions logged yet for this player.</p>
      ) : (
        <>
          <PlayerCharts sessions={sessions} />

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Sprint times (s)</th>
                  <th className="text-left px-4 py-2">Best sprint</th>
                  <th className="text-left px-4 py-2">Throw velos (mph)</th>
                  <th className="text-left px-4 py-2">Best throw</th>
                  <th className="text-left px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .slice()
                  .reverse()
                  .map((s, i) => (
                    <tr key={i} className="border-t border-white/10">
                      <td className="px-4 py-2 whitespace-nowrap">{s.date}</td>
                      <td className="px-4 py-2 font-mono">{s.sprintTimes.join(", ") || "—"}</td>
                      <td className="px-4 py-2 font-mono">
                        {s.bestSprint ? `${s.bestSprint.toFixed(2)}s` : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono">{s.throwVelos.join(", ") || "—"}</td>
                      <td className="px-4 py-2 font-mono">
                        {s.bestThrow ? `${s.bestThrow.toFixed(0)} mph` : "—"}
                      </td>
                      <td className="px-4 py-2 text-white/50">{s.notes || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<p className="text-white/50 text-sm">Loading...</p>}>
      <PlayerContent />
    </Suspense>
  );
}
