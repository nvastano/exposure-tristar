"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { normalizeSessions, formatDate } from "@/lib/stats";
import type { RawEntryRow, Session } from "@/lib/stats";
import type { RawMetricRow } from "@/lib/metrics";
import { metricDef } from "@/lib/metrics";
import PlayerCharts from "./PlayerCharts";
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string; Number?: string };

function PlayerContent() {
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") || "";

  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [metrics, setMetrics] = useState<RawMetricRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(playerName));
  const [editingId, setEditingId] = useState<string | null>(null);
  const { unlocked, setUnlocked } = useCoachUnlocked();

  async function load() {
    if (!playerName) return;
    setLoading(true);
    try {
      const [players, entries, metricRows] = await Promise.all([
        sheetsGet("players") as Promise<PlayerRow[]>,
        sheetsGet("entries", { player: playerName }) as Promise<RawEntryRow[]>,
        sheetsGet("metrics", { player: playerName }) as Promise<RawMetricRow[]>,
      ]);
      const match = players.find(
        (p) => p.Name.trim().toLowerCase() === playerName.trim().toLowerCase()
      );
      setPlayer(match || null);
      setSessions(normalizeSessions(entries));
      setMetrics(metricRows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNumber() {
    if (!player) return;
    await sheetsPost("updatePlayer", { id: player.Id, number: numberInput.trim() });
    setEditingNumber(false);
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  async function handleDeleteSession(session: Session) {
    if (!session.id) return;
    if (!confirm(`Delete the session from ${session.date}?`)) return;
    await sheetsPost("deleteEntry", { id: session.id });
    load();
  }

  async function handleSaveSession(session: Session, sprintStr: string, throwStr: string, notes: string) {
    const sprintTimes = sprintStr
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const throwVelos = throwStr
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    await sheetsPost("updateEntry", { id: session.id, sprintTimes, throwVelos, notes });
    setEditingId(null);
    load();
  }

  async function handleDeleteMetric(id: string) {
    if (!confirm("Delete this entry?")) return;
    await sheetsPost("deleteMetric", { id });
    load();
  }

  if (!playerName) {
    return <p className="text-white/50 text-sm">No player selected.</p>;
  }

  if (loading) {
    return <LogoLoader />;
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-wide">{playerName}</h1>
          {player?.Number && !editingNumber && (
            <span className="text-white/40 text-lg font-mono">#{player.Number}</span>
          )}
          {unlocked && editingNumber && (
            <>
              <input
                autoFocus
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder="#"
                className="bg-white/5 border border-accent/50 rounded px-2 py-1 text-sm w-16"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNumber();
                  if (e.key === "Escape") setEditingNumber(false);
                }}
              />
              <button onClick={handleSaveNumber} className="text-accent text-sm hover:underline">
                Save
              </button>
              <button
                onClick={() => setEditingNumber(false)}
                className="text-white/40 text-sm hover:text-white"
              >
                Cancel
              </button>
            </>
          )}
          {unlocked && !editingNumber && (
            <button
              onClick={() => {
                setNumberInput(player?.Number || "");
                setEditingNumber(true);
              }}
              className="text-white/40 hover:text-accent text-lg font-mono"
              title="Edit jersey number"
            >
              {player?.Number ? "✎" : "+ #"}
            </button>
          )}
        </div>
        <p className="text-white/50 text-sm mt-1">Week-over-week progress</p>
        <div className="mt-2">
          <CoachUnlock unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
        </div>
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
                  <th className="text-left px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .slice()
                  .reverse()
                  .map((s) => (
                    <SessionRow
                      key={s.id || s.date}
                      session={s}
                      editing={editingId === s.id}
                      canEdit={unlocked}
                      onEdit={() => setEditingId(s.id)}
                      onCancel={() => setEditingId(null)}
                      onSave={handleSaveSession}
                      onDelete={() => handleDeleteSession(s)}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {metrics.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Stat</th>
                <th className="text-left px-4 py-2">Value</th>
                <th className="text-left px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {metrics
                .slice()
                .reverse()
                .map((m) => (
                  <tr key={m.Id} className="border-t border-white/10">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(m.Date)}</td>
                    <td className="px-4 py-2">{metricDef(m.Metric)?.label || m.Metric}</td>
                    <td className="px-4 py-2 font-mono">{m.Value}</td>
                    <td className="px-4 py-2">
                      {unlocked && (
                        <button
                          onClick={() => handleDeleteMetric(m.Id)}
                          className="text-white/40 hover:text-accent"
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  editing,
  canEdit,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  session: Session;
  editing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (session: Session, sprintStr: string, throwStr: string, notes: string) => void;
  onDelete: () => void;
}) {
  const [sprintStr, setSprintStr] = useState(session.sprintTimes.join(", "));
  const [throwStr, setThrowStr] = useState(session.throwVelos.join(", "));
  const [notes, setNotes] = useState(session.notes);

  if (editing && canEdit) {
    return (
      <tr className="border-t border-white/10 bg-white/5">
        <td className="px-4 py-2 whitespace-nowrap">{session.date}</td>
        <td className="px-4 py-2" colSpan={2}>
          <input
            value={sprintStr}
            onChange={(e) => setSprintStr(e.target.value)}
            placeholder="4.53, 4.43"
            className="bg-white/5 border border-white/10 rounded px-2 py-1 w-full font-mono"
          />
        </td>
        <td className="px-4 py-2" colSpan={2}>
          <input
            value={throwStr}
            onChange={(e) => setThrowStr(e.target.value)}
            placeholder="50, 48"
            className="bg-white/5 border border-white/10 rounded px-2 py-1 w-full font-mono"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button
            onClick={() => onSave(session, sprintStr, throwStr, notes)}
            className="text-accent hover:underline mr-2"
          >
            Save
          </button>
          <button onClick={onCancel} className="text-white/40 hover:text-white">
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-2 whitespace-nowrap">{session.date}</td>
      <td className="px-4 py-2 font-mono">{session.sprintTimes.join(", ") || "—"}</td>
      <td className="px-4 py-2 font-mono">
        {session.bestSprint ? `${session.bestSprint.toFixed(2)}s` : "—"}
      </td>
      <td className="px-4 py-2 font-mono">{session.throwVelos.join(", ") || "—"}</td>
      <td className="px-4 py-2 font-mono">
        {session.bestThrow ? `${session.bestThrow.toFixed(0)} mph` : "—"}
      </td>
      <td className="px-4 py-2 text-white/50">{session.notes || "—"}</td>
      <td className="px-4 py-2 whitespace-nowrap">
        {canEdit && (
          <>
            <button onClick={onEdit} className="text-white/40 hover:text-accent mr-2" aria-label="Edit">
              ✎
            </button>
            <button onClick={onDelete} className="text-white/40 hover:text-accent" aria-label="Delete">
              ✕
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<LogoLoader />}>
      <PlayerContent />
    </Suspense>
  );
}
