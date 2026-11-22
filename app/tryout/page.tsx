"use client";

import { useState } from "react";
import { sheetsPost } from "@/lib/sheets";

const POSITIONS = ["Pitcher", "Catcher", "1st Base", "2nd Base", "3rd Base", "Shortstop", "Outfield", "Utility"] as const;

const CATEGORIES = [
  { key: "effort",            label: "Effort" },
  { key: "attitude",          label: "Attitude" },
  { key: "recovery",          label: "Recovery" },
  { key: "parentConvo",       label: "Parent Convo" },
  { key: "takingCorrection",  label: "Taking Correction" },
  { key: "swing",             label: "Swing" },
  { key: "fieldingMechanics", label: "Fielding Mechanics" },
  { key: "personalAppearance",label: "Personal Appearance" },
  { key: "arrivalTime",       label: "Arrival Time" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];
type Scores = Partial<Record<CategoryKey, number>>;

type Player = {
  id: number;
  name: string;
  age: string;
  bats: string;
  throws: string;
  pos: string[];
  notes: string;
  scores: Scores;
  exitVelo: string;
  throwVelo: string;
};

function emptyScores(): Scores {
  return {};
}

function avg(scores: Scores): number | null {
  const vals = CATEGORIES.map((c) => scores[c.key]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function scoreColor(n: number | null): string {
  if (n === null) return "text-white/30";
  if (n >= 4) return "text-emerald-400";
  if (n >= 3) return "text-yellow-400";
  return "text-red-400";
}

// ── Position picker ───────────────────────────────────────────────
function PositionPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (pos: string[]) => void;
}) {
  function toggle(p: string) {
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {POSITIONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => toggle(p)}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
            selected.includes(p)
              ? "bg-white text-black"
              : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Score button row ──────────────────────────────────────────────
function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{label}</span>
        <span className={`text-lg font-black tabular-nums ${scoreColor(value ?? null)}`}>
          {value ?? "—"}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }, (_, i) => i).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 rounded py-1.5 text-xs font-bold transition-colors ${
              value === n
                ? "bg-white text-black"
                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Scoring modal ─────────────────────────────────────────────────
function ScoringModal({
  player,
  onSave,
  onClose,
}: {
  player: Player;
  onSave: (updated: Player) => void;
  onClose: () => void;
}) {
  const [scores, setScores] = useState<Scores>({ ...player.scores });
  const [exitVelo, setExitVelo] = useState(player.exitVelo);
  const [throwVelo, setThrowVelo] = useState(player.throwVelo);
  const [notes, setNotes] = useState(player.notes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function setScore(key: CategoryKey, val: number) {
    setScores((prev) => ({ ...prev, [key]: val }));
  }

  const average = avg(scores);
  const scored = CATEGORIES.filter((c) => scores[c.key] != null).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-lg bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Scoring</p>
            <h2 className="text-xl font-black">{player.name}</h2>
            {(player.age || player.pos.length > 0 || player.bats || player.throws) && (
              <p className="text-xs text-white/40 mt-0.5">
                {[
                  player.age ? `Age ${player.age}` : "",
                  player.pos.join("/"),
                  player.bats ? `B:${player.bats}` : "",
                  player.throws ? `T:${player.throws}` : "",
                ].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-3xl font-black tabular-nums ${scoreColor(average)}`}>
              {average !== null ? average.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-white/40">{scored}/{CATEGORIES.length} scored</p>
          </div>
        </div>

        {/* Scroll area */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {CATEGORIES.map((cat, i) => (
            <div key={cat.key}>
              <ScoreRow
                label={cat.label}
                value={scores[cat.key]}
                onChange={(v) => setScore(cat.key, v)}
              />
              {i < CATEGORIES.length - 1 && <div className="mt-4 border-t border-white/5" />}
            </div>
          ))}

          <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Velocity</p>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Exit Velo</label>
                <div className="relative">
                  <input
                    type="number"
                    value={exitVelo}
                    onChange={(e) => setExitVelo(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={130}
                    inputMode="numeric"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-12 text-lg font-black text-white placeholder-white/20 focus:outline-none focus:border-white/30 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">mph</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Throw Velo</label>
                <div className="relative">
                  <input
                    type="number"
                    value={throwVelo}
                    onChange={(e) => setThrowVelo(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={110}
                    inputMode="numeric"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-12 text-lg font-black text-white placeholder-white/20 focus:outline-none focus:border-white/30 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">mph</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, standout moments…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-5 py-4 flex flex-col gap-2">
          {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-white/15 text-white/60 font-bold text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={async () => {
                setSaveError(null);
                setSaving(true);
                const updated = { ...player, scores, exitVelo, throwVelo, notes };
                try {
                  await sheetsPost("saveTryoutPlayer", {
                    playerName: updated.name,
                    age: updated.age,
                    bats: updated.bats,
                    throws: updated.throws,
                    positions: updated.pos.join(", "),
                    tryoutDate: new Date().toISOString().slice(0, 10),
                    ...Object.fromEntries(
                      CATEGORIES.map((c) => [c.key, updated.scores[c.key] ?? ""])
                    ),
                    exitVelo: updated.exitVelo,
                    throwVelo: updated.throwVelo,
                    notes: updated.notes,
                  });
                } catch {
                  setSaveError("Sheet save failed — scores kept locally.");
                } finally {
                  setSaving(false);
                  onSave(updated);
                }
              }}
              className="flex-1 py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Scores"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────
function PlayerCard({
  player,
  rank,
  onClick,
}: {
  player: Player;
  rank: number;
  onClick: () => void;
}) {
  const average = avg(player.scores);
  const scored = CATEGORIES.filter((c) => player.scores[c.key] != null).length;
  const complete = scored === CATEGORIES.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all flex items-center gap-3"
    >
      <span className="text-xs font-bold text-white/30 w-5 shrink-0 tabular-nums">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{player.name}</p>
        <p className="text-xs text-white/40 mt-0.5">
          {complete ? "Complete ✓" : scored === 0 ? "Not yet scored" : `${scored}/${CATEGORIES.length} scored`}
        </p>
        {(player.pos.length > 0 || player.age) && (
          <p className="text-xs text-white/30 mt-0.5 truncate">
            {[player.pos.join(" / "), player.age ? `Age ${player.age}` : ""].filter(Boolean).join(" · ")}
          </p>
        )}
        {(player.bats || player.throws) && (
          <p className="text-xs text-white/30 mt-0.5">
            {[player.bats ? `B: ${player.bats}` : "", player.throws ? `T: ${player.throws}` : ""].filter(Boolean).join("  ")}
          </p>
        )}
        {(player.exitVelo || player.throwVelo) && (
          <p className="text-xs text-white/30 tabular-nums mt-0.5">
            {[player.exitVelo ? `EV ${player.exitVelo} mph` : "", player.throwVelo ? `TV ${player.throwVelo} mph` : ""].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-2xl font-black tabular-nums ${scoreColor(average)}`}>
          {average !== null ? average.toFixed(1) : "—"}
        </p>
        <p className="text-xs text-white/30">/5</p>
      </div>
    </button>
  );
}

// ── Hand picker ───────────────────────────────────────────────────
function HandPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</span>
      <div className="flex gap-1.5">
        {["R", "L", "S"].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange(value === h ? "" : h)}
            className={`flex-1 py-1.5 rounded-md text-xs font-black transition-colors ${
              value === h ? "bg-white text-black" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
            }`}
          >
            {h === "R" ? "Right" : h === "L" ? "Left" : "Switch"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add player form ───────────────────────────────────────────────
function AddPlayerForm({ onAdd }: { onAdd: (p: Player) => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bats, setBats] = useState("");
  const [throws, setThrows] = useState("");
  const [pos, setPos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onAdd({ id: Date.now(), name: n, age, bats, throws, pos, notes: "", scores: emptyScores(), exitVelo: "", throwVelo: "" });
    setName("");
    setAge("");
    setBats("");
    setThrows("");
    setPos([]);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 hover:text-white/60 hover:border-white/30 text-sm font-bold transition-colors"
      >
        + Add Player
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Add Player</p>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Player name"
        className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 w-full"
      />
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        placeholder="Age (optional)"
        min={5}
        max={18}
        className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 w-full"
      />
      <div className="flex gap-3">
        <HandPicker label="Bats" value={bats} onChange={setBats} />
        <HandPicker label="Throws" value={throws} onChange={setThrows} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Positions</span>
        <PositionPicker selected={pos} onChange={setPos} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 border border-white/15 rounded-lg text-white/50 text-sm font-bold hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-black hover:bg-white/90 transition-colors"
        >
          Add
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function TryoutPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [scoring, setScoring] = useState<Player | null>(null);

  function addPlayer(p: Player) {
    setPlayers((prev) => [...prev, p]);
  }

  function saveScores(updated: Player) {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setScoring(null);
  }

  function removePlayer(id: number) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  // Sort by average descending, unsorted at bottom
  const sorted = [...players].sort((a, b) => {
    const aa = avg(a.scores);
    const bb = avg(b.scores);
    if (aa === null && bb === null) return 0;
    if (aa === null) return 1;
    if (bb === null) return -1;
    return bb - aa;
  });

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-1">Tristar Baseball</p>
        <h1 className="text-3xl font-black tracking-tight">Tryout Scoring</h1>
        <p className="text-sm text-white/40 mt-1">
          Add players, then tap a card to score them.
        </p>
      </div>

      {/* Player list */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
              {players.length} Player{players.length !== 1 ? "s" : ""}
            </p>
            {sorted.some((p) => avg(p.scores) !== null) && (
              <p className="text-xs text-white/30">ranked by avg</p>
            )}
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} className="relative group">
              <PlayerCard
                player={p}
                rank={i + 1}
                onClick={() => setScoring(p)}
              />
              <button
                onClick={() => removePlayer(p.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 text-xs transition-all"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <AddPlayerForm onAdd={addPlayer} />

      {/* Score summary table */}
      {players.some((p) => avg(p.scores) !== null) && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Category Breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-2 font-semibold text-white/40 text-xs">Player</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.key} className="px-2 py-2 font-semibold text-white/40 text-xs text-center whitespace-nowrap">
                      {c.label.split(" ").map((w) => w[0]).join("")}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-semibold text-white/40 text-xs text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {sorted
                  .filter((p) => avg(p.scores) !== null)
                  .map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setScoring(p)}
                      className="border-b border-white/5 last:border-none hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-4 py-2 font-bold truncate max-w-[100px]">{p.name}</td>
                      {CATEGORIES.map((c) => (
                        <td key={c.key} className={`px-2 py-2 text-center tabular-nums font-semibold ${scoreColor(p.scores[c.key] ?? null)}`}>
                          {p.scores[c.key] ?? "—"}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-black tabular-nums ${scoreColor(avg(p.scores))}`}>
                        {avg(p.scores)?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-white/5 text-xs text-white/20">
            {CATEGORIES.map((c) => c.label.split(" ").map((w) => w[0]).join("")).join(" · ")}
          </div>
        </div>
      )}

      {/* Scoring modal */}
      {scoring && (
        <ScoringModal
          player={scoring}
          onSave={saveScores}
          onClose={() => setScoring(null)}
        />
      )}
    </div>
  );
}
