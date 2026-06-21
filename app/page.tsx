"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { normalizeSessions, bestSprintEver, bestThrowEver, sprintDelta, throwDelta } from "@/lib/stats";
import type { RawEntryRow, Session } from "@/lib/stats";
import PlayerPhoto from "@/components/PlayerPhoto";
import PracticeLeaderboard from "@/components/PracticeLeaderboard";
import CoachEntryForm from "@/components/CoachEntryForm";

type PlayerRow = { Id: string; Name: string; Number?: string; Position?: string };

function sortByNumber(players: PlayerRow[]): PlayerRow[] {
  return players.slice().sort((a, b) => {
    const an = parseInt(a.Number || "", 10);
    const bn = parseInt(b.Number || "", 10);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    if (Number.isFinite(an)) return -1;
    if (Number.isFinite(bn)) return 1;
    return a.Name.localeCompare(b.Name);
  });
}

export default function Home() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [byPlayer, setByPlayer] = useState<Map<string, Session[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [playersData, entriesData] = await Promise.all([
        sheetsGet("players") as Promise<PlayerRow[]>,
        sheetsGet("entries") as Promise<RawEntryRow[]>,
      ]);
      setPlayers(sortByNumber(playersData));
      const map = new Map<string, Session[]>();
      for (const p of playersData) map.set(p.Name, []);
      for (const s of normalizeSessions(entriesData)) {
        if (!map.has(s.player)) map.set(s.player, []);
        map.get(s.player)!.push(s);
      }
      setByPlayer(map);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(player: PlayerRow) {
    if (!confirm(`Delete ${player.Name}? This removes them from the roster (their session history stays in the sheet).`)) {
      return;
    }
    await sheetsPost("deletePlayer", { id: player.Id });
    refresh();
  }

  async function handleRename(player: PlayerRow, newName: string) {
    if (!newName.trim() || newName === player.Name) {
      setEditing(null);
      return;
    }
    await sheetsPost("updatePlayer", { id: player.Id, name: newName.trim() });
    setEditing(null);
    refresh();
  }

  async function handleAddPlayer() {
    if (!newName.trim()) return;
    await sheetsPost("addPlayer", { name: newName.trim(), number: newNumber.trim() });
    setNewName("");
    setNewNumber("");
    setAddingPlayer(false);
    refresh();
  }

  if (loading) {
    return <p className="text-white/50 text-sm">Loading...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
        <p className="font-semibold mb-1">Sheet not connected yet</p>
        <p className="text-white/70">{error}</p>
        <p className="text-white/50 mt-2">
          Deploy the Apps Script Web App and set{" "}
          <code className="text-accent">NEXT_PUBLIC_SHEETS_WEBAPP_URL</code> in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">PRACTICE STATS</h1>
          <p className="text-white/50 text-sm mt-1">
            Home-to-first sprint times and 3rd-to-1st throw velocity, tracked week over week.
          </p>
        </div>
        {!addingPlayer && (
          <button
            onClick={() => setAddingPlayer(true)}
            className="shrink-0 bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            + Add Player
          </button>
        )}
      </div>

      {addingPlayer && (
        <div className="rounded-lg border border-white/10 p-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Cafrey Grizzle"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPlayer();
                if (e.key === "Escape") setAddingPlayer(false);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm w-24">
            Number
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="#"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPlayer();
                if (e.key === "Escape") setAddingPlayer(false);
              }}
            />
          </label>
          <button
            onClick={handleAddPlayer}
            className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={() => {
              setAddingPlayer(false);
              setNewName("");
              setNewNumber("");
            }}
            className="text-white/40 hover:text-white text-sm px-2 py-2"
          >
            Cancel
          </button>
        </div>
      )}

      <CoachEntryForm onSaved={refresh} />

      {players.length === 0 && (
        <p className="text-white/50 text-sm">No players yet. Add one above to get started.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => {
          const sessions = byPlayer.get(player.Name) || [];
          const bestSprint = bestSprintEver(sessions);
          const bestThrow = bestThrowEver(sessions);
          const sDelta = sprintDelta(sessions);
          const tDelta = throwDelta(sessions);

          return (
            <div
              key={player.Id}
              className="rounded-lg border border-white/10 p-5 hover:border-accent/60 transition-colors flex flex-col gap-3 relative"
            >
              <div className="flex items-center gap-3">
                <PlayerPhoto name={player.Name} />
                <div className="flex-1 min-w-0">
                  {editing === player.Id ? (
                    <input
                      autoFocus
                      defaultValue={player.Name}
                      onBlur={(e) => handleRename(player, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(player, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="bg-white/5 border border-accent/50 rounded px-2 py-1 text-sm w-full"
                    />
                  ) : (
                    <Link href={`/players?name=${encodeURIComponent(player.Name)}`} className="font-bold text-lg truncate block">
                      {player.Number && (
                        <span className="text-accent font-mono mr-1.5">#{player.Number}</span>
                      )}
                      {player.Name}
                    </Link>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(player.Id);
                  }}
                  className="text-white/30 hover:text-accent text-xs px-1"
                  aria-label="Edit name"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(player);
                  }}
                  className="text-white/30 hover:text-accent text-xs px-1"
                  aria-label="Delete player"
                  title="Delete"
                >
                  ✕
                </button>
              </div>

              <Link href={`/players?name=${encodeURIComponent(player.Name)}`} className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Best sprint (home–1st)</span>
                  <span className="font-mono">
                    {bestSprint ? `${bestSprint.toFixed(2)}s` : "—"}
                  </span>
                </div>
                {sDelta !== null && (
                  <DeltaBadge value={sDelta} betterWhenNegative label="vs last session" unit="s" />
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Best throw (3rd–1st)</span>
                  <span className="font-mono">
                    {bestThrow ? `${bestThrow.toFixed(0)} mph` : "—"}
                  </span>
                </div>
                {tDelta !== null && (
                  <DeltaBadge value={tDelta} betterWhenNegative={false} label="vs last session" unit=" mph" />
                )}

                {sessions.length === 0 && (
                  <span className="text-white/30 text-xs">No sessions logged yet</span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {players.length > 0 && <PracticeLeaderboard players={players} byPlayer={byPlayer} />}
    </div>
  );
}

function DeltaBadge({
  value,
  betterWhenNegative,
  label,
  unit,
}: {
  value: number;
  betterWhenNegative: boolean;
  label: string;
  unit: string;
}) {
  const improved = betterWhenNegative ? value < 0 : value > 0;
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/30">{label}</span>
      <span className={improved ? "text-green-400" : "text-accent"}>
        {sign}
        {value.toFixed(2)}
        {unit}
      </span>
    </div>
  );
}
