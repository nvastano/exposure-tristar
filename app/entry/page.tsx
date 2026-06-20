"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { METRIC_DEFS } from "@/lib/metrics";

const TODAY = new Date().toISOString().slice(0, 10);
const NEW_PLAYER = "__new__";

type PlayerRow = { Name: string };

export default function EntryPage() {
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState("");
  const [date, setDate] = useState(TODAY);
  const [sprintTimes, setSprintTimes] = useState<string[]>([""]);
  const [throwVelos, setThrowVelos] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [metricValues, setMetricValues] = useState<Record<string, string | boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = (await sheetsGet("players")) as PlayerRow[];
        setPlayers(data.map((p) => p.Name).filter(Boolean));
      } catch {
        // sheet not connected yet; player list just stays empty
      }
    })();
  }, []);

  const isNewPlayer = selectedPlayer === NEW_PLAYER;
  const playerName = isNewPlayer ? newPlayerName.trim() : selectedPlayer;

  function updateField(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) {
    const next = [...list];
    next[index] = value;
    setList(next);
  }

  function addField(list: string[], setList: (v: string[]) => void) {
    setList([...list, ""]);
  }

  function removeField(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setStatus(null);

    if (!playerName) {
      setStatus("Error: choose a player or enter a name.");
      return;
    }

    const cleanSprints = sprintTimes.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n) && n > 0);
    const cleanThrows = throwVelos.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n) && n > 0);

    const metricEntries = METRIC_DEFS.filter((def) => {
      const v = metricValues[def.key];
      return def.type === "boolean" ? v === true : Boolean(v && String(v).trim());
    }).map((def) => ({
      date,
      player: playerName,
      metric: def.key,
      value: def.type === "boolean" ? "yes" : String(metricValues[def.key]),
    }));

    if (!cleanSprints.length && !cleanThrows.length && !metricEntries.length) {
      setStatus("Error: enter at least one sprint time, throw velocity, or other stat.");
      return;
    }

    setSubmitting(true);
    try {
      if (isNewPlayer && newPlayerPhoto.trim()) {
        await sheetsPost("addPlayer", { name: playerName, photo: newPlayerPhoto.trim() });
      }
      if (cleanSprints.length || cleanThrows.length) {
        await sheetsPost("addEntry", {
          date,
          player: playerName,
          sprintTimes: cleanSprints,
          throwVelos: cleanThrows,
          notes,
        });
      }
      if (metricEntries.length) {
        await sheetsPost("bulkMetrics", { entries: metricEntries });
      }
      setStatus(`Saved session for ${playerName} on ${date}.`);
      setSprintTimes([""]);
      setThrowVelos([""]);
      setNotes("");
      setMetricValues({});
      if (isNewPlayer) {
        setPlayers((prev) => [...prev, playerName]);
        setSelectedPlayer(playerName);
        setNewPlayerName("");
        setNewPlayerPhoto("");
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">COACH ENTRY</h1>
        <p className="text-white/50 text-sm mt-1">
          Pick a player, add as many sprint times and throw velocities as you captured today.
        </p>
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
        <>
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
          <label className="flex flex-col gap-1 text-sm">
            Photo filename (optional)
            <input
              type="text"
              value={newPlayerPhoto}
              onChange={(e) => setNewPlayerPhoto(e.target.value)}
              placeholder="e.g. hudson-vastano.jpg (drop the file in public/players/)"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm w-48">
        Session date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      <FieldList
        label="Sprint times — home to 1st (seconds)"
        values={sprintTimes}
        onChange={(i, v) => updateField(sprintTimes, setSprintTimes, i, v)}
        onAdd={() => addField(sprintTimes, setSprintTimes)}
        onRemove={(i) => removeField(sprintTimes, setSprintTimes, i)}
        placeholder="4.53"
      />

      <FieldList
        label="Throw velocities — 3rd to 1st (mph)"
        values={throwVelos}
        onChange={(i, v) => updateField(throwVelos, setThrowVelos, i, v)}
        onAdd={() => addField(throwVelos, setThrowVelos)}
        onRemove={(i) => removeField(throwVelos, setThrowVelos, i)}
        placeholder="50"
      />

      <label className="flex flex-col gap-1 text-sm">
        Notes (optional)
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <span className="text-sm text-white/50">Other workouts</span>
        {METRIC_DEFS.map((def) =>
          def.type === "boolean" ? (
            <label key={def.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={metricValues[def.key] === true}
                onChange={(e) =>
                  setMetricValues((prev) => ({ ...prev, [def.key]: e.target.checked }))
                }
                className="w-4 h-4"
              />
              {def.label}
            </label>
          ) : (
            <label key={def.key} className="flex flex-col gap-1 text-sm">
              {def.label}
              <input
                type="number"
                value={(metricValues[def.key] as string) || ""}
                onChange={(e) =>
                  setMetricValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                }
                className="bg-white/5 border border-white/10 rounded px-3 py-2 w-32"
              />
            </label>
          )
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-5 py-2.5 rounded disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save to Sheet"}
      </button>

      {status && <p className="text-sm text-white/70">{status}</p>}
    </div>
  );
}

function FieldList({
  label,
  values,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span>{label}</span>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={v}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
            className="bg-white/5 border border-white/10 rounded px-3 py-2 flex-1"
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-white/40 hover:text-accent px-2"
              aria-label="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="self-start text-accent text-sm hover:underline"
      >
        + Add another
      </button>
    </div>
  );
}
