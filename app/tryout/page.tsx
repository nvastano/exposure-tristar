"use client";

import { useState, useEffect } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

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

const COACHES = ["Sean", "Brian", "Nick"] as const;

type Player = {
  id: number;
  name: string;
  age: string;
  bats: string;
  throws: string;
  pos: string[];
  prevTeam: string;
  city: string;
};

type Entry = {
  coach: string;
  scores: Scores;
  exitVelo: string;
  throwVelo: string;
  notes: string;
  tryoutDate: string;
};

function emptyScores(): Scores {
  return {};
}

function entryAvg(scores: Scores): number | null {
  const vals = CATEGORIES.map((c) => scores[c.key]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function avgAcrossEntries(entries: Entry[]): Scores {
  const result: Scores = {};
  for (const cat of CATEGORIES) {
    const vals = entries.map((e) => e.scores[cat.key]).filter((v): v is number => v != null);
    if (vals.length) result[cat.key] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return result;
}

function overallAvg(entries: Entry[]): number | null {
  const avgs = entries.map((e) => entryAvg(e.scores)).filter((v): v is number => v != null);
  if (!avgs.length) return null;
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
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
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => i).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`rounded py-1.5 text-xs font-bold transition-colors ${
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

// ── Scoring modal (eval editor) ───────────────────────────────────
function ScoringModal({
  player,
  initialEntry,
  onSave,
  onClose,
}: {
  player: Player;
  initialEntry: Entry | null;
  onSave: (entry: Entry) => void;
  onClose: () => void;
}) {
  const [scores, setScores] = useState<Scores>(initialEntry ? { ...initialEntry.scores } : emptyScores());
  const [exitVelo, setExitVelo] = useState(initialEntry?.exitVelo ?? "");
  const [throwVelo, setThrowVelo] = useState(initialEntry?.throwVelo ?? "");
  const [notes, setNotes] = useState(initialEntry?.notes ?? "");
  const [coach, setCoach] = useState(initialEntry?.coach ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function setScore(key: CategoryKey, val: number) {
    setScores((prev) => ({ ...prev, [key]: val }));
  }

  const average = entryAvg(scores);
  const scored = CATEGORIES.filter((c) => scores[c.key] != null).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-lg bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92dvh] min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
              {initialEntry ? "Edit Eval" : "New Eval"}
            </p>
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
          {/* Coach picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Evaluating Coach</span>
            <div className="flex gap-1.5 flex-wrap">
              {COACHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoach(coach === c ? "" : c)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    coach === c ? "bg-white text-black" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
              <input
                type="text"
                value={COACHES.includes(coach as typeof COACHES[number]) ? "" : coach}
                onChange={(e) => setCoach(e.target.value)}
                placeholder="Other…"
                className="flex-1 min-w-[80px] bg-white/10 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div className="border-t border-white/5" />

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
                const entry: Entry = {
                  coach,
                  scores,
                  exitVelo,
                  throwVelo,
                  notes,
                  tryoutDate: new Date().toISOString().slice(0, 10),
                };
                try {
                  await sheetsPost("saveTryoutEntry", {
                    tryoutSheetId: String(player.id),
                    tryoutDate: entry.tryoutDate,
                    coach: entry.coach,
                    ...Object.fromEntries(CATEGORIES.map((c) => [c.key, entry.scores[c.key] ?? ""])),
                    exitVelo: entry.exitVelo,
                    throwVelo: entry.throwVelo,
                    notes: entry.notes,
                  });
                } catch {
                  setSaveError("Sheet save failed — scores kept locally.");
                } finally {
                  setSaving(false);
                  onSave(entry);
                }
              }}
              className="flex-1 py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Eval"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Player detail view ────────────────────────────────────────────
function PlayerDetail({
  player,
  entries,
  onAddEval,
  onEditEval,
  onBack,
}: {
  player: Player;
  entries: Entry[];
  onAddEval: () => void;
  onEditEval: (entry: Entry) => void;
  onBack: () => void;
}) {
  const overall = overallAvg(entries);
  const avgScores = avgAcrossEntries(entries);
  const totalScored = CATEGORIES.filter((c) => avgScores[c.key] != null).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onBack()}
    >
      <div className="w-full sm:max-w-lg bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-white transition-colors p-1 -ml-1"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black truncate">{player.name}</h2>
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
            {(player.prevTeam || player.city) && (
              <p className="text-xs text-white/30 mt-0.5">
                {[player.prevTeam, player.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-3xl font-black tabular-nums ${scoreColor(overall)}`}>
              {overall !== null ? overall.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-white/30">{entries.length} eval{entries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Eval list */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {entries.length === 0 && (
            <p className="text-sm text-white/30 text-center py-6">No evals yet. Be the first to score this player.</p>
          )}

          {entries.map((entry, i) => {
            const avg = entryAvg(entry.scores);
            const scored = CATEGORIES.filter((c) => entry.scores[c.key] != null).length;
            return (
              <button
                key={i}
                onClick={() => onEditEval(entry)}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{entry.coach || <span className="text-white/30 italic">Unknown coach</span>}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {scored === CATEGORIES.length ? "Complete ✓" : scored === 0 ? "No scores yet" : `${scored}/${CATEGORIES.length} scored`}
                    </p>
                    {(entry.exitVelo || entry.throwVelo) && (
                      <p className="text-xs text-white/30 tabular-nums mt-0.5">
                        {[entry.exitVelo ? `EV ${entry.exitVelo} mph` : "", entry.throwVelo ? `TV ${entry.throwVelo} mph` : ""].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-white/30 mt-1 truncate">{entry.notes}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-2xl font-black tabular-nums ${scoreColor(avg)}`}>
                      {avg !== null ? avg.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-white/30">/5</p>
                  </div>
                </div>

                {/* Per-category mini scores */}
                {scored > 0 && (
                  <div className="mt-3 grid grid-cols-9 gap-1">
                    {CATEGORIES.map((cat) => {
                      const v = entry.scores[cat.key];
                      return (
                        <div key={cat.key} className="flex flex-col items-center gap-0.5">
                          <span className="text-white/20 text-[9px] leading-none">{cat.label.split(" ").map((w) => w[0]).join("")}</span>
                          <span className={`text-xs font-bold tabular-nums ${scoreColor(v ?? null)}`}>
                            {v ?? "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}

          {/* Averaged summary if multiple evals */}
          {entries.length > 1 && totalScored > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Avg Across All Evals</p>
              <div className="grid grid-cols-9 gap-1">
                {CATEGORIES.map((cat) => {
                  const v = avgScores[cat.key];
                  return (
                    <div key={cat.key} className="flex flex-col items-center gap-0.5">
                      <span className="text-white/20 text-[9px] leading-none">{cat.label.split(" ").map((w) => w[0]).join("")}</span>
                      <span className={`text-xs font-bold tabular-nums ${scoreColor(v ?? null)}`}>
                        {v != null ? v.toFixed(1) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <button
            onClick={onAddEval}
            className="w-full py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 transition-colors"
          >
            + Add Eval
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────
function PlayerCard({
  player,
  entries,
  rank,
  onClick,
}: {
  player: Player;
  entries: Entry[];
  rank: number;
  onClick: () => void;
}) {
  const avg = overallAvg(entries);
  const evalCount = entries.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all flex items-center gap-3"
    >
      <span className="text-xs font-bold text-white/30 w-5 shrink-0 tabular-nums">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{player.name}</p>
        <p className="text-xs text-white/40 mt-0.5">
          {evalCount === 0 ? "No evals yet" : `${evalCount} eval${evalCount !== 1 ? "s" : ""}`}
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
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-2xl font-black tabular-nums ${scoreColor(avg)}`}>
          {avg !== null ? avg.toFixed(1) : "—"}
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
  const [prevTeam, setPrevTeam] = useState("");
  const [city, setCity] = useState("");
  const [pos, setPos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onAdd({ id: Date.now(), name: n, age, bats, throws, pos, prevTeam, city });
    setName("");
    setAge("");
    setBats("");
    setThrows("");
    setPrevTeam("");
    setCity("");
    setPos([]);
    setOpen(false);
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
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={prevTeam}
          onChange={(e) => setPrevTeam(e.target.value)}
          placeholder="Previous team"
          className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
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
  const [entriesByPlayer, setEntriesByPlayer] = useState<Record<string, Entry[]>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null | "new">(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      sheetsGet("tryoutPlayers"),
      sheetsGet("tryoutEntries"),
    ])
      .then(([playerRows, entryRows]: [Record<string, string>[], Record<string, string>[]]) => {
        const grouped: Record<string, Entry[]> = {};
        for (const e of entryRows) {
          const key = String(e.TryoutSheetId);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            coach: e.Coach || "",
            scores: {
              effort:            e.Effort !== "" && e.Effort != null ? Number(e.Effort) : undefined,
              attitude:          e.Attitude !== "" && e.Attitude != null ? Number(e.Attitude) : undefined,
              recovery:          e.Recovery !== "" && e.Recovery != null ? Number(e.Recovery) : undefined,
              parentConvo:       e.ParentConvo !== "" && e.ParentConvo != null ? Number(e.ParentConvo) : undefined,
              takingCorrection:  e.TakingCorrection !== "" && e.TakingCorrection != null ? Number(e.TakingCorrection) : undefined,
              swing:             e.Swing !== "" && e.Swing != null ? Number(e.Swing) : undefined,
              fieldingMechanics: e.FieldingMechanics !== "" && e.FieldingMechanics != null ? Number(e.FieldingMechanics) : undefined,
              personalAppearance:e.PersonalAppearance !== "" && e.PersonalAppearance != null ? Number(e.PersonalAppearance) : undefined,
              arrivalTime:       e.ArrivalTime !== "" && e.ArrivalTime != null ? Number(e.ArrivalTime) : undefined,
            },
            exitVelo: e.ExitVelo || "",
            throwVelo: e.ThrowVelo || "",
            notes: e.Notes || "",
            tryoutDate: e.TryoutDate || "",
          });
        }
        setEntriesByPlayer(grouped);
        setPlayers(
          playerRows.map((r) => ({
            id: Number(r.SheetId) || Date.now(),
            name: r.PlayerName || "",
            age: r.Age || "",
            bats: r.Bats || "",
            throws: r.Throws || "",
            pos: r.Positions ? r.Positions.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            prevTeam: r.PrevTeam || "",
            city: r.City || "",
          }))
        );
      })
      .catch(() => setLoadError("Couldn't load players from sheet."))
      .finally(() => setLoading(false));
  }, []);

  async function addPlayer(p: Player) {
    setPlayers((prev) => [...prev, p]);
    try {
      await sheetsPost("saveTryoutPlayer", {
        sheetId: String(p.id),
        playerName: p.name,
        age: p.age,
        bats: p.bats,
        throws: p.throws,
        prevTeam: p.prevTeam,
        city: p.city,
        positions: p.pos.join(", "),
        tryoutDate: new Date().toISOString().slice(0, 10),
      });
    } catch {
      // silent
    }
  }

  function saveEntry(entry: Entry) {
    if (!selectedPlayer) return;
    const key = String(selectedPlayer.id);
    setEntriesByPlayer((prev) => {
      const existing = prev[key] || [];
      const idx = existing.findIndex((e) => e.coach === entry.coach);
      const updated = idx >= 0
        ? existing.map((e, i) => i === idx ? entry : e)
        : [...existing, entry];
      return { ...prev, [key]: updated };
    });
    setEditingEntry(null);
  }

  function removePlayer(id: number) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setEntriesByPlayer((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
  }

  // Sort by overall average descending
  const sorted = [...players].sort((a, b) => {
    const aa = overallAvg(entriesByPlayer[String(a.id)] || []);
    const bb = overallAvg(entriesByPlayer[String(b.id)] || []);
    if (aa === null && bb === null) return 0;
    if (aa === null) return 1;
    if (bb === null) return -1;
    return bb - aa;
  });

  const selectedEntries = selectedPlayer ? (entriesByPlayer[String(selectedPlayer.id)] || []) : [];
  const avgScoresForTable = (p: Player) => avgAcrossEntries(entriesByPlayer[String(p.id)] || []);

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-1">Tristar Baseball</p>
        <h1 className="text-3xl font-black tracking-tight">Tryout Scoring</h1>
        <p className="text-sm text-white/40 mt-1">
          Tap a player to view evals and add your own.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-white/40 text-center py-4">Loading players…</p>
      )}
      {loadError && (
        <p className="text-sm text-red-400 text-center">{loadError}</p>
      )}

      {/* Player list */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
              {players.length} Player{players.length !== 1 ? "s" : ""}
            </p>
            {sorted.some((p) => overallAvg(entriesByPlayer[String(p.id)] || []) !== null) && (
              <p className="text-xs text-white/30">ranked by avg</p>
            )}
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} className="relative group">
              <PlayerCard
                player={p}
                entries={entriesByPlayer[String(p.id)] || []}
                rank={i + 1}
                onClick={() => setSelectedPlayer(p)}
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

      {!loading && sorted.length === 0 && !loadError && (
        <p className="text-sm text-white/30 text-center py-2">No players added yet.</p>
      )}

      <AddPlayerForm onAdd={addPlayer} />

      {/* Score summary table */}
      {players.some((p) => overallAvg(entriesByPlayer[String(p.id)] || []) !== null) && (
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
                  .filter((p) => overallAvg(entriesByPlayer[String(p.id)] || []) !== null)
                  .map((p) => {
                    const scores = avgScoresForTable(p);
                    const avg = overallAvg(entriesByPlayer[String(p.id)] || []);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPlayer(p)}
                        className="border-b border-white/5 last:border-none hover:bg-white/5 cursor-pointer"
                      >
                        <td className="px-4 py-2 font-bold truncate max-w-[100px]">{p.name}</td>
                        {CATEGORIES.map((c) => (
                          <td key={c.key} className={`px-2 py-2 text-center tabular-nums font-semibold ${scoreColor(scores[c.key] ?? null)}`}>
                            {scores[c.key] != null ? (scores[c.key] as number).toFixed(1) : "—"}
                          </td>
                        ))}
                        <td className={`px-3 py-2 text-right font-black tabular-nums ${scoreColor(avg)}`}>
                          {avg?.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-white/5 text-xs text-white/20">
            {CATEGORIES.map((c) => c.label.split(" ").map((w) => w[0]).join("")).join(" · ")}
          </div>
        </div>
      )}

      {/* Player detail view */}
      {selectedPlayer && editingEntry === null && (
        <PlayerDetail
          player={selectedPlayer}
          entries={selectedEntries}
          onAddEval={() => setEditingEntry("new")}
          onEditEval={(entry) => setEditingEntry(entry)}
          onBack={() => setSelectedPlayer(null)}
        />
      )}

      {/* Scoring modal */}
      {selectedPlayer && editingEntry !== null && (
        <ScoringModal
          player={selectedPlayer}
          initialEntry={editingEntry === "new" ? null : editingEntry}
          onSave={saveEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
