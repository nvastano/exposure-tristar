"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

// Pitch Smart / Little League 11-12U rest rules
const REST_RULES = [
  { max: 20,  days: 0 },
  { max: 35,  days: 1 },
  { max: 50,  days: 2 },
  { max: 65,  days: 3 },
  { max: Infinity, days: 4 },
];

const CONTEXTS = ["Game", "Practice", "Bullpen", "Lesson"] as const;
type Context = typeof CONTEXTS[number];

type PlayerRow = { Name: string };

type PitchEntry = {
  Id: string;
  Pitcher: string;
  Date: string;
  Context: Context;
  Pitches: string;
  Innings: string;
  Notes: string;
};

function requiredRest(pitches: number): number {
  return REST_RULES.find((r) => pitches <= r.max)!.days;
}

function canPitchOn(lastDate: string, pitches: number): string {
  const days = requiredRest(pitches);
  if (days === 0) return lastDate; // same day fine
  const d = new Date(lastDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function daysUntil(iso: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const t = new Date(today + "T12:00:00");
  const target = new Date(iso + "T12:00:00");
  return Math.ceil((target.getTime() - t.getTime()) / 86400000);
}

function weekStart(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

const contextColor: Record<string, string> = {
  Game:     "text-green-400 bg-green-400/10 border-green-400/20",
  Practice: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Bullpen:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Lesson:   "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export default function PitchTrackerPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [log, setLog] = useState<PitchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [pitcher, setPitcher] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [context, setContext] = useState<Context>("Game");
  const [pitches, setPitches] = useState("");
  const [innings, setInnings] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      sheetsGet("pitchLog").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<PitchEntry[]>,
    ]).then(([p, l]) => {
      setPlayers(p);
      setLog(l.sort((a, b) => b.Date.localeCompare(a.Date)));
    }).finally(() => setLoading(false));
  }, []);

  // Last outing per pitcher
  const lastOuting = useMemo(() => {
    const map = new Map<string, PitchEntry>();
    for (const e of [...log].sort((a, b) => b.Date.localeCompare(a.Date))) {
      if (!map.has(e.Pitcher)) map.set(e.Pitcher, e);
    }
    return map;
  }, [log]);

  // Weekly totals for selected pitcher
  const pitcherLog = useMemo(
    () => log.filter((e) => e.Pitcher === pitcher).sort((a, b) => b.Date.localeCompare(a.Date)),
    [log, pitcher]
  );

  const weeklyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of pitcherLog) {
      const w = weekStart(e.Date);
      map.set(w, (map.get(w) || 0) + (parseInt(e.Pitches) || 0));
    }
    return map;
  }, [pitcherLog]);

  const last = pitcher ? lastOuting.get(pitcher) : null;
  const pitchCount = parseInt(pitches) || 0;
  const earliestNext = last ? canPitchOn(last.Date, parseInt(last.Pitches) || 0) : null;
  const today = new Date().toISOString().slice(0, 10);
  const restDaysLeft = earliestNext ? Math.max(0, daysUntil(earliestNext)) : 0;
  const canPitchToday = !earliestNext || earliestNext <= today;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pitcher) { setError("Select a pitcher."); return; }
    if (!pitchCount || pitchCount < 1) { setError("Enter a valid pitch count."); return; }
    setSaving(true);
    try {
      await sheetsPost("logPitch", { pitcher, date, context, pitches: pitchCount, innings, notes });
      const newEntry: PitchEntry = { Id: Date.now().toString(), Pitcher: pitcher, Date: date, Context: context, Pitches: pitchCount.toString(), Innings: innings, Notes: notes };
      setLog((prev) => [newEntry, ...prev].sort((a, b) => b.Date.localeCompare(a.Date)));
      setPitches("");
      setInnings("");
      setNotes("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LogoLoader />;

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-wide">⚾ Pitch Tracker</h1>
        <p className="text-white/40 text-sm mt-1">Log outings and track rest requirements per Pitch Smart guidelines.</p>
      </div>

      {/* Status cards — show when pitcher selected and has history */}
      {pitcher && last && (
        <div className={`rounded-xl border p-5 flex flex-col gap-1 ${canPitchToday ? "border-green-500/30 bg-green-500/5" : "border-accent/30 bg-accent/5"}`}>
          <p className="text-xs font-bold tracking-widest uppercase text-white/40">Current Status — {pitcher.split(" ")[0]}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap mt-1">
            <div>
              <p className={`text-3xl font-black ${canPitchToday ? "text-green-400" : "text-accent"}`}>
                {canPitchToday ? "✓ Clear to pitch" : `Rest — ${restDaysLeft} day${restDaysLeft !== 1 ? "s" : ""} remaining`}
              </p>
              <p className="text-white/40 text-xs mt-1">
                Last outing: {formatDate(last.Date)} · {last.Pitches} pitches ({last.Context})
                {" · "}{requiredRest(parseInt(last.Pitches) || 0)} days required rest
              </p>
            </div>
            {!canPitchToday && earliestNext && (
              <div className="text-right">
                <p className="text-xs text-white/40">Earliest next outing</p>
                <p className="text-lg font-bold font-mono">{formatDate(earliestNext)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/3 p-5">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Log Outing</p>

        {/* Pitcher + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Pitcher</label>
            <select
              value={pitcher}
              onChange={(e) => setPitcher(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-accent/60"
            >
              <option value="">Select pitcher…</option>
              {players.map((p) => (
                <option key={p.Name} value={p.Name}>{p.Name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-accent/60"
            />
          </div>
        </div>

        {/* Context */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40">Context</label>
          <div className="flex gap-2 flex-wrap">
            {CONTEXTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setContext(c)}
                className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                  context === c ? contextColor[c] : "border-white/10 text-white/30 hover:text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Pitches + Innings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Pitch Count</label>
            <input
              type="number"
              min="1"
              max="200"
              inputMode="numeric"
              value={pitches}
              onChange={(e) => setPitches(e.target.value)}
              placeholder="e.g. 48"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Innings Pitched <span className="text-white/20">(optional)</span></label>
            <input
              type="text"
              value={innings}
              onChange={(e) => setInnings(e.target.value)}
              placeholder="e.g. 2.1"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
          </div>
        </div>

        {/* Rest preview */}
        {pitchCount > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-white/50">{pitchCount} pitches → <strong className="text-white">{requiredRest(pitchCount)} day{requiredRest(pitchCount) !== 1 ? "s" : ""}</strong> required rest</span>
            <span className="text-white/30 text-xs">Earliest next: {formatDate(canPitchOn(date, pitchCount))}</span>
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40">Notes <span className="text-white/20">(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Velocity, command, fatigue, etc."
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60 resize-none text-sm"
          />
        </div>

        {error && <p className="text-accent text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">✓ Outing logged.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/80 transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Log Outing"}
        </button>
      </form>

      {/* History */}
      {pitcher && pitcherLog.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">{pitcher.split(" ")[0]}'s History</h2>

          {/* Weekly totals */}
          {weeklyTotals.size > 0 && (
            <div className="flex gap-2 flex-wrap mb-1">
              {[...weeklyTotals.entries()].slice(0, 4).map(([week, total]) => (
                <div key={week} className="rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-center min-w-[80px]">
                  <p className="text-lg font-black font-mono">{total}</p>
                  <p className="text-[10px] text-white/30">wk of {formatDate(week)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {pitcherLog.map((e) => {
              const pc = parseInt(e.Pitches) || 0;
              const rest = requiredRest(pc);
              return (
                <div key={e.Id} className="rounded-lg border border-white/10 bg-white/3 px-4 py-3 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black">{pc} pitches</span>
                      {e.Innings && <span className="text-white/40 text-xs">{e.Innings} IP</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${contextColor[e.Context] || "border-white/10 text-white/30"}`}>
                        {e.Context}
                      </span>
                    </div>
                    {e.Notes && <p className="text-xs text-white/40 italic">{e.Notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatDate(e.Date)}</p>
                    <p className="text-[10px] text-white/30">{rest}d rest req.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pitch Smart reference */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-4">
        <p className="text-xs font-bold tracking-widest text-white/20 uppercase mb-3">Pitch Smart Rest Rules (11–12U)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {REST_RULES.map((r, i) => {
            const prev = i === 0 ? 1 : REST_RULES[i - 1].max + 1;
            const label = r.max === Infinity ? `${prev}+` : `${prev}–${r.max}`;
            return (
              <div key={i} className="rounded border border-white/5 px-3 py-2 text-center">
                <p className="text-xs font-mono text-white/50">{label}</p>
                <p className="text-lg font-black text-white/60">{r.days}d</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
