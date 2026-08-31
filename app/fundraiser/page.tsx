"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";
import Modal from "@/components/Modal";
import Countdown from "@/components/Countdown";

// Players who have closed out — no more sales accepted
const CLOSED_PLAYERS = ["Hugh Horvath", "Carson Grizzle"];

// ── Swap this out for each new fundraiser ──────────────────────────────────
const FUNDRAISER = {
  id: "mums-2026",
  name: "Mums Sale",
  emoji: "🌻",
  unit: "mums",
  unitLabel: "Mums Sold",
  playerGoal: 30,
  teamGoal: 300,
  stretchGoal: 430,
  endDate: new Date("2026-08-31T23:59:59"),
  pricePerUnit: 25,
  costPerUnit: 10,
};
// ──────────────────────────────────────────────────────────────────────────

type PlayerRow = { Name: string };
type SaleRow = { Player: string; Units: string; FundraiserId: string; Date: string; CreatedAt: string };

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function FundraiserPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntry, setShowEntry] = useState(false);
  const [entryPlayer, setEntryPlayer] = useState("");
  const [entryUnits, setEntryUnits] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    try {
      const [p, s] = await Promise.all([
        sheetsGet("players") as Promise<PlayerRow[]>,
        sheetsGet("fundraiserSales").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<SaleRow[]>,
      ]);
      setPlayers(p);
      setSales(s.filter((r) => r.FundraiserId === FUNDRAISER.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      map.set(s.Player, (map.get(s.Player) ?? 0) + (parseInt(s.Units, 10) || 0));
    }
    return map;
  }, [sales]);

  const ranked = useMemo(() => {
    return players
      .map((p) => ({ name: p.Name, units: totals.get(p.Name) ?? 0 }))
      .sort((a, b) => b.units - a.units);
  }, [players, totals]);

  const teamTotal = useMemo(() => ranked.reduce((s, p) => s + p.units, 0), [ranked]);
  const teamGoal = players.length > 0 ? players.length * FUNDRAISER.playerGoal : FUNDRAISER.teamGoal;
  const progressPct = Math.min((teamTotal / teamGoal) * 100, 100);
  const playersAtGoal = ranked.filter((p) => p.units >= FUNDRAISER.playerGoal).length;
  const revenue = teamTotal * FUNDRAISER.pricePerUnit;
  const netProfit = teamTotal * (FUNDRAISER.pricePerUnit - FUNDRAISER.costPerUnit);

  async function handleSubmit() {
    if (!entryPlayer) { setStatus("Pick your name."); return; }
    const units = parseInt(entryUnits, 10);
    if (!units || units < 0) { setStatus("Enter a valid number."); return; }
    setSubmitting(true);
    setStatus(null);
    try {
      await sheetsPost("logFundraiserSale", {
        fundraiserId: FUNDRAISER.id,
        player: entryPlayer,
        units,
      });
      setShowEntry(false);
      setEntryPlayer("");
      setEntryUnits("");
      refresh();
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LogoLoader />;

  const ended = new Date() > FUNDRAISER.endDate;

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Active Fundraiser</p>
          <h1 className="text-2xl font-bold tracking-wide">
            {FUNDRAISER.emoji} {FUNDRAISER.name.toUpperCase()}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Log your total {FUNDRAISER.unit} sold — update anytime as you sell more.
          </p>
        </div>
        {!ended && (
          <button
            onClick={() => setShowEntry(true)}
            className="shrink-0 bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            + Log My Sales
          </button>
        )}
      </div>

      {/* Countdown */}
      {!ended ? (
        <Countdown endDate={FUNDRAISER.endDate} />
      ) : (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-4 text-center">
          <p className="text-accent font-bold text-lg">Sale Ended — Final Results Below</p>
        </div>
      )}

      {/* Team Progress */}
      {(() => {
        const stretchPct = Math.min((teamTotal / FUNDRAISER.stretchGoal) * 100, 100);
        const goalMarkerPct = (teamGoal / FUNDRAISER.stretchGoal) * 100;
        const hitGoal = teamTotal >= teamGoal;
        const hitStretch = teamTotal >= FUNDRAISER.stretchGoal;
        return (
          <div className="rounded-lg border border-white/10 bg-white/3 p-5 flex flex-col gap-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Team Total</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-0.5">
                  {teamTotal}
                  <span className="text-white/40 text-lg font-normal ml-1">{FUNDRAISER.unit}</span>
                </p>
              </div>
              <div className="text-right flex flex-col gap-1">
                <div>
                  <p className="text-xs text-white/40">Team Goal</p>
                  <p className={`text-base font-bold font-mono ${hitGoal ? "text-green-400 line-through" : "text-white/60"}`}>{teamGoal}</p>
                </div>
                <div>
                  <p className="text-xs text-yellow-400/60">Stretch Goal 🌟</p>
                  <p className={`text-base font-bold font-mono ${hitStretch ? "text-yellow-400" : "text-yellow-400/60"}`}>{FUNDRAISER.stretchGoal}</p>
                </div>
                <p className="text-xs text-white/30">{playersAtGoal}/{players.length} at individual goal</p>
              </div>
            </div>
            {/* Progress bar scaled to stretch goal */}
            <div className="relative h-4 rounded-full bg-white/10 overflow-visible">
              {/* Fill */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${hitStretch ? "bg-yellow-400" : hitGoal ? "bg-green-500" : "bg-accent"}`}
                style={{ width: `${stretchPct}%`, borderRadius: "9999px" }}
              />
              {/* Goal marker line */}
              {!hitStretch && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                  style={{ left: `${goalMarkerPct}%` }}
                  title={`Team goal: ${teamGoal}`}
                />
              )}
              {(hitGoal || hitStretch) && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white rounded-full overflow-hidden"
                  style={{ background: hitStretch ? "rgba(234,179,8,0.85)" : "rgba(22,163,74,0.85)" }}>
                  {hitStretch ? "STRETCH GOAL REACHED! 🌟" : "TEAM GOAL REACHED! 🎉"}
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-white/30">
              <span>{Math.round(stretchPct)}% to stretch goal</span>
              {!hitGoal && <span>{teamGoal - teamTotal} to team goal</span>}
              {hitGoal && !hitStretch && <span className="text-yellow-400/70">{FUNDRAISER.stretchGoal - teamTotal} to stretch 🌟</span>}
            </div>
          </div>
        );
      })()}

      {/* Revenue & Profit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/3 p-4 flex flex-col gap-1">
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Revenue</p>
          <p className="text-2xl font-bold font-mono tabular-nums">${revenue.toLocaleString()}</p>
          <p className="text-xs text-white/30">${FUNDRAISER.pricePerUnit}/mum × {teamTotal}</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex flex-col gap-1">
          <p className="text-xs font-bold tracking-widest text-green-400/70 uppercase">Net Profit</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-green-400">${netProfit.toLocaleString()}</p>
          <p className="text-xs text-white/30">${FUNDRAISER.pricePerUnit - FUNDRAISER.costPerUnit} profit/mum</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-widest text-white/50 uppercase">Leaderboard</h2>
        {ranked.length === 0 ? (
          <p className="text-white/30 text-sm">No sales logged yet — be the first!</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {ranked.map((p, i) => {
              const goalPct = Math.min((p.units / FUNDRAISER.playerGoal) * 100, 100);
              const hitGoal = p.units >= FUNDRAISER.playerGoal;
              return (
                <div
                  key={p.name}
                  className={`rounded-lg border p-4 flex flex-col gap-2 ${
                    hitGoal
                      ? "border-green-500/40 bg-green-500/5"
                      : i === 0 && p.units > 0
                      ? "border-yellow-500/40 bg-yellow-500/5"
                      : "border-white/10 bg-white/3"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center shrink-0">
                      {hitGoal ? "✅" : p.units > 0 ? rankBadge(i + 1) : <span className="text-white/20 text-sm">—</span>}
                    </span>
                    <span className="font-semibold flex-1">{p.name}</span>
                    <span className="font-mono font-bold tabular-nums text-right">
                      <span className={hitGoal ? "text-green-400" : ""}>{p.units}</span>
                      <span className="text-white/30 font-normal text-xs">/{FUNDRAISER.playerGoal}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                        hitGoal ? "bg-green-500" : "bg-accent"
                      }`}
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/30 text-right">
                    {hitGoal
                      ? `Goal reached! +${p.units - FUNDRAISER.playerGoal} extra`
                      : `${FUNDRAISER.playerGoal - p.units} to go`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Sales Modal */}
      <Modal open={showEntry} onClose={() => { setShowEntry(false); setStatus(null); }}>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-wide">{FUNDRAISER.emoji} LOG MY SALES</h2>
            <p className="text-white/50 text-sm mt-1">
              Enter how many additional {FUNDRAISER.unit} you sold — this will be added to your current total.
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Your name
            <select
              value={entryPlayer}
              onChange={(e) => setEntryPlayer(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            >
              <option value="">Select your name...</option>
              {players
                .filter((p) => !CLOSED_PLAYERS.includes(p.Name))
                .map((p) => (
                  <option key={p.Name} value={p.Name}>{p.Name}</option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {FUNDRAISER.unit} sold since last update
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={entryUnits}
              onChange={(e) => setEntryUnits(e.target.value)}
              placeholder="e.g. 12"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 w-40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </label>

          {status && <p className="text-sm text-accent">{status}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="self-start bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-5 py-2.5 rounded disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
