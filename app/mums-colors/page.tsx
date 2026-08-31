"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

const FUNDRAISER_ID = "mums-2026";
const PRICE_PER_MUM = 25;

const COLORS = [
  { key: "red",      label: "Red",       emoji: "🔴" },
  { key: "white",    label: "White",     emoji: "⚪" },
  { key: "yellow",   label: "Yellow",    emoji: "🟡" },
  { key: "bronze",   label: "Bronze",    emoji: "🟤" },
  { key: "purple",   label: "Purple",    emoji: "🟣" },
  { key: "triColor", label: "Tri-Color", emoji: "🌈" },
] as const;

type ColorKey = typeof COLORS[number]["key"];

type PlayerRow = { Name: string };
type SaleRow = { Player: string; Units: string; FundraiserId: string };
type ColorsRow = { Player: string; FundraiserId: string };

type ColorCounts = Record<ColorKey, string>;

const emptyColors = (): ColorCounts =>
  Object.fromEntries(COLORS.map((c) => [c.key, ""])) as ColorCounts;

export default function MumsColorsPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [submitted, setSubmitted] = useState<ColorsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [player, setPlayer] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [counts, setCounts] = useState<ColorCounts>(emptyColors);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      sheetsGet("fundraiserSales").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<SaleRow[]>,
      sheetsGet("mumsColors").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<ColorsRow[]>,
    ]).then(([p, s, c]) => {
      setPlayers(p);
      setSales(s.filter((r) => r.FundraiserId === FUNDRAISER_ID));
      setSubmitted(c.filter((r) => r.FundraiserId === FUNDRAISER_ID));
    }).finally(() => setLoading(false));
  }, []);

  // Players who haven't submitted color breakdown yet
  const alreadySubmitted = useMemo(
    () => new Set(submitted.map((r) => r.Player.trim().toLowerCase())),
    [submitted]
  );

  const eligiblePlayers = useMemo(
    () => players.filter((p) => {
      const hasSales = sales.some((s) => s.Player.trim().toLowerCase() === p.Name.trim().toLowerCase());
      return hasSales && !alreadySubmitted.has(p.Name.trim().toLowerCase());
    }),
    [players, sales, alreadySubmitted]
  );

  const playerTotal = useMemo(() => {
    if (!player) return 0;
    const rows = sales.filter((s) => s.Player.trim().toLowerCase() === player.trim().toLowerCase());
    return rows.reduce((sum, r) => sum + (parseInt(r.Units) || 0), 0);
  }, [player, sales]);

  const colorTotal = useMemo(
    () => COLORS.reduce((sum, c) => sum + (parseInt(counts[c.key]) || 0), 0),
    [counts]
  );

  const amountDue = playerTotal * PRICE_PER_MUM;

  function setCount(key: ColorKey, val: string) {
    setCounts((prev) => ({ ...prev, [key]: val.replace(/\D/g, "") }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!player) { setError("Please select your player."); return; }
    if (!firstName.trim() || !lastName.trim()) { setError("Please enter your first and last name."); return; }
    if (colorTotal !== playerTotal) {
      setError(`Your color counts add up to ${colorTotal}, but ${player} sold ${playerTotal} mums. Please adjust so they match.`);
      return;
    }
    setSaving(true);
    try {
      await sheetsPost("logMumsColors", {
        fundraiserId: FUNDRAISER_ID,
        player,
        ...Object.fromEntries(COLORS.map((c) => [c.key, parseInt(counts[c.key]) || 0])),
        totalMums: playerTotal,
        amountDue,
        submittedBy: `${firstName.trim()} ${lastName.trim()}`,
      });
      // Remove from eligible list immediately so it won't reappear if user goes back
      setSubmitted((prev) => [...prev, { Player: player, FundraiserId: FUNDRAISER_ID } as ColorsRow]);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LogoLoader />;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center max-w-sm mx-auto">
        <p className="text-4xl">🌻</p>
        <h1 className="text-2xl font-bold tracking-wide">Thank you!</h1>
        <p className="text-white/50 text-sm">
          Color breakdown for <strong className="text-white">{player}</strong> has been recorded.
        </p>
        <div className="rounded-lg border border-white/10 bg-white/5 px-6 py-4 w-full">
          <p className="text-xs text-white/40 mb-1">Amount to Venmo</p>
          <p className="text-3xl font-black font-mono text-accent">${amountDue}</p>
          <p className="text-xs text-white/30 mt-1">({playerTotal} mums × ${PRICE_PER_MUM} each)</p>
        </div>
        <p className="text-white/30 text-xs">Venmo details will be shared by the coach separately.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">🌻 Mums Color Breakdown</h1>
        <p className="text-white/40 text-sm mt-1">
          Tell us how many of each color your player sold. The total must match their overall mums count.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Player select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-widest text-white/40 uppercase">Player</label>
          {eligiblePlayers.length === 0 ? (
            <p className="text-sm text-white/30 italic">
              {players.length === 0
                ? "No players found."
                : "All players have already submitted their color breakdown."}
            </p>
          ) : (
            <select
              value={player}
              onChange={(e) => { setPlayer(e.target.value); setCounts(emptyColors()); }}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-accent/60"
            >
              <option value="">Select player…</option>
              {eligiblePlayers.map((p) => (
                <option key={p.Name} value={p.Name}>{p.Name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Parent name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-widest text-white/40 uppercase">Your Name (Parent / Guardian)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
          </div>
        </div>

        {/* Mums total banner */}
        {player && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/40">Total mums sold</p>
              <p className="text-2xl font-black font-mono">{playerTotal}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Amount to Venmo</p>
              <p className="text-2xl font-black font-mono text-accent">${amountDue}</p>
              <p className="text-[10px] text-white/30">${PRICE_PER_MUM} × {playerTotal} mums</p>
            </div>
          </div>
        )}

        {/* Color inputs */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest text-white/40 uppercase">Colors Sold</label>
          <div className="grid grid-cols-2 gap-2">
            {COLORS.map((c) => (
              <div key={c.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2.5">
                <span className="text-lg">{c.emoji}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-white/40">{c.label}</span>
                  <input
                    type="number"
                    min="0"
                    max={playerTotal || 999}
                    inputMode="numeric"
                    value={counts[c.key]}
                    onChange={(e) => setCount(c.key, e.target.value)}
                    placeholder="0"
                    className="bg-transparent text-white font-bold text-lg w-full focus:outline-none placeholder-white/20"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Running total */}
          {player && (
            <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${
              colorTotal === playerTotal
                ? "border-green-500/40 bg-green-500/10"
                : colorTotal > playerTotal
                ? "border-accent/40 bg-accent/10"
                : "border-white/20 bg-white/5"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black font-mono ${colorTotal === playerTotal ? "text-green-400" : colorTotal > playerTotal ? "text-accent" : "text-white"}`}>
                  {colorTotal}
                </span>
                <span className="text-white/40 text-sm">/ {playerTotal} colors entered</span>
              </div>
              <div className={`text-sm font-bold ${colorTotal === playerTotal ? "text-green-400" : colorTotal > playerTotal ? "text-accent" : "text-white/60"}`}>
                {colorTotal === playerTotal
                  ? "✓ Matches — ready to submit"
                  : colorTotal > playerTotal
                  ? `${colorTotal - playerTotal} too many`
                  : `${playerTotal - colorTotal} remaining`}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-accent text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || eligiblePlayers.length === 0}
          className="rounded-md bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent/80 transition-colors disabled:opacity-40"
        >
          {saving ? "Submitting…" : "Submit Color Breakdown"}
        </button>
      </form>
    </div>
  );
}
