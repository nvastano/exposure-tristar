"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

const FUNDRAISER_ID = "mums-2026";
const PRICE_PER_MUM = 25;

const COLORS = [
  { key: "Red",      label: "Red",       emoji: "🔴" },
  { key: "White",    label: "White",     emoji: "⚪" },
  { key: "Yellow",   label: "Yellow",    emoji: "🟡" },
  { key: "Bronze",   label: "Bronze",    emoji: "🟤" },
  { key: "Purple",   label: "Purple",    emoji: "🟣" },
  { key: "TriColor", label: "Tri-Color", emoji: "🌈" },
] as const;

type ColorKey = typeof COLORS[number]["key"];

type ColorsRow = {
  Player: string; FundraiserId: string; SubmittedBy: string;
  Red: string; White: string; Yellow: string; Bronze: string; Purple: string; TriColor: string;
  TotalMums: string; AmountDue: string; CreatedAt: string;
};

type PlayerRow = { Name: string };
type SaleRow = { Player: string; Units: string; FundraiserId: string };

export default function MumsColorsAdmin() {
  const [rows, setRows] = useState<ColorsRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sheetsGet("mumsColors").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<ColorsRow[]>,
      sheetsGet("players") as Promise<PlayerRow[]>,
      sheetsGet("fundraiserSales").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<SaleRow[]>,
    ]).then(([c, p, s]) => {
      setRows(c.filter((r) => r.FundraiserId === FUNDRAISER_ID));
      setPlayers(p);
      setSales(s.filter((r) => r.FundraiserId === FUNDRAISER_ID));
    }).finally(() => setLoading(false));
  }, []);

  const playerSales = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const key = s.Player.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + (parseInt(s.Units) || 0));
    }
    return map;
  }, [sales]);

  const submittedSet = useMemo(
    () => new Set(rows.map((r) => r.Player.trim().toLowerCase())),
    [rows]
  );

  const notSubmitted = useMemo(
    () => players.filter((p) => {
      const key = p.Name.trim().toLowerCase();
      return playerSales.has(key) && !submittedSet.has(key);
    }),
    [players, playerSales, submittedSet]
  );

  // Aggregate color totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of COLORS) t[c.key] = 0;
    let totalMums = 0, totalDue = 0;
    for (const r of rows) {
      for (const c of COLORS) t[c.key] += parseInt((r as any)[c.key]) || 0;
      totalMums += parseInt(r.TotalMums) || 0;
      totalDue += parseFloat(r.AmountDue) || 0;
    }
    return { colors: t, totalMums, totalDue };
  }, [rows]);

  if (loading) return <LogoLoader />;

  const submissionUrl = typeof window !== "undefined"
    ? `${window.location.origin}/exposure-tristar/mums-colors`
    : "/exposure-tristar/mums-colors";

  return (
    <div className="flex flex-col gap-8">
      {/* Share link */}
      <div className="rounded-lg border border-white/10 bg-white/3 p-4 flex flex-col gap-2">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Parent Submission Link</p>
        <p className="text-sm font-mono text-accent break-all">{submissionUrl}</p>
        <p className="text-xs text-white/30">Share this with parents to collect their color breakdowns.</p>
      </div>

      {/* Summary totals */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Team Totals — {rows.length} of {rows.length + notSubmitted.length} submitted</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {COLORS.map((c) => (
            <div key={c.key} className="rounded-lg border border-white/10 bg-white/3 p-3 text-center">
              <p className="text-xl">{c.emoji}</p>
              <p className="text-lg font-black font-mono mt-1">{totals.colors[c.key]}</p>
              <p className="text-[10px] text-white/30">{c.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/3 p-4">
            <p className="text-xs text-white/40">Total Mums (submitted)</p>
            <p className="text-2xl font-black font-mono">{totals.totalMums}</p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="text-xs text-white/40">Total Amount Due</p>
            <p className="text-2xl font-black font-mono text-accent">${totals.totalDue.toLocaleString()}</p>
            <p className="text-[10px] text-white/30 mt-0.5">${PRICE_PER_MUM}/mum</p>
          </div>
        </div>
      </div>

      {/* Per-player table */}
      {rows.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Player Breakdowns</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-3 py-2.5 text-xs font-bold text-white/40 whitespace-nowrap">Player</th>
                  {COLORS.map((c) => (
                    <th key={c.key} className="px-3 py-2.5 text-xs font-bold text-white/40 text-center whitespace-nowrap">
                      {c.emoji} {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs font-bold text-white/40 text-center">Total</th>
                  <th className="px-3 py-2.5 text-xs font-bold text-accent/60 text-right whitespace-nowrap">Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      <span>{r.Player}</span>
                      {r.SubmittedBy && (
                        <span className="ml-2 text-[10px] text-white/30">via {r.SubmittedBy}</span>
                      )}
                    </td>
                    {COLORS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 text-center font-mono">
                        {parseInt((r as any)[c.key]) || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-mono font-bold">{parseInt(r.TotalMums) || 0}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-accent">
                      ${parseFloat(r.AmountDue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not yet submitted */}
      {notSubmitted.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-widest text-white/30 uppercase mb-2">Waiting On ({notSubmitted.length})</h2>
          <div className="flex flex-col gap-1">
            {notSubmitted.map((p) => (
              <div key={p.Name} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/3 px-4 py-2.5">
                <span className="text-sm text-white/60">{p.Name}</span>
                <span className="text-xs text-white/30">{playerSales.get(p.Name.trim().toLowerCase()) || 0} mums · ${((playerSales.get(p.Name.trim().toLowerCase()) || 0) * PRICE_PER_MUM).toLocaleString()} due</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
