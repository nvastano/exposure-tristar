"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { localDateStr } from "@/lib/stats";

const TODAY = localDateStr();
const NEW_PLAYER = "__new__";

type StatType = "sprint" | "throw";
type PlayerRow = { Name: string };

export default function CoachEntryForm({ onSaved }: { onSaved?: () => void }) {
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [date, setDate] = useState(TODAY);
  const [statType, setStatType] = useState<StatType>("sprint");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = (await sheetsGet("players")) as PlayerRow[];
        setPlayers(data.map((p) => p.Name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
      } catch {
        // sheet not connected yet; player list just stays empty
      }
    })();
  }, []);

  const isNewPlayer = selectedPlayer === NEW_PLAYER;
  const playerName = isNewPlayer ? newPlayerName.trim() : selectedPlayer;

  async function handleSubmit() {
    setStatus(null);

    if (!playerName) {
      setStatus("Error: choose a player or enter a name.");
      return;
    }

    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) {
      setStatus("Error: enter a valid value.");
      return;
    }

    setSubmitting(true);
    try {
      await sheetsPost("addEntry", {
        date,
        player: playerName,
        sprintTimes: statType === "sprint" ? [num] : [],
        throwVelos: statType === "throw" ? [num] : [],
      });

      setStatus(`Logged ${num} for ${playerName}.`);
      setValue("");
      if (isNewPlayer) {
        setPlayers((prev) => [...prev, playerName].sort((a, b) => a.localeCompare(b)));
        setNewPlayerName("");
      }
      setSelectedPlayer("");
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
        <h2 className="text-xl font-bold tracking-wide">COACH ENTRY</h2>
        <p className="text-white/50 text-sm mt-1">
          Select a player, enter one sprint time or throw velocity, and save. Repeat for each player as
          they go through the drill.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm w-48">
        Session date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={statType === "sprint"}
            onChange={() => setStatType("sprint")}
          />
          Sprint time (home–1st, s)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={statType === "throw"}
            onChange={() => setStatType("throw")}
          />
          Throw velocity (3rd–1st, mph)
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Player
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        >
          <option value="" disabled>
            Select a player...
          </option>
          {players.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={NEW_PLAYER}>+ Add new player</option>
        </select>
      </label>

      {isNewPlayer && (
        <label className="flex flex-col gap-1 text-sm">
          New player name
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="e.g. Cafrey"
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm w-48">
        {statType === "sprint" ? "Sprint time (s)" : "Throw velocity (mph)"}
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={statType === "sprint" ? "4.53" : "50"}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-5 py-2.5 rounded disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save & next player"}
      </button>

      {status && <p className="text-sm text-white/70">{status}</p>}
    </div>
  );
}
