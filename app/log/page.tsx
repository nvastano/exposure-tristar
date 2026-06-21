"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { METRIC_CATEGORIES, METRIC_DEFS } from "@/lib/metrics";
import { localDateStr } from "@/lib/stats";

const TODAY = localDateStr();

type PlayerRow = { Name: string };

export default function LogPage() {
  const [players, setPlayers] = useState<string[]>([]);
  const [player, setPlayer] = useState("");
  const [date, setDate] = useState(TODAY);
  const [metricValues, setMetricValues] = useState<Record<string, string | boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = (await sheetsGet("players")) as PlayerRow[];
        setPlayers(data.map((p) => p.Name).filter(Boolean));
      } catch {
        // sheet not connected yet
      }
    })();
  }, []);

  async function handleSubmit() {
    setStatus(null);
    if (!player) {
      setStatus("Pick your name first.");
      return;
    }

    const metricEntries = METRIC_DEFS.filter((def) => {
      const v = metricValues[def.key];
      return def.type === "boolean" ? v === true : Boolean(v && String(v).trim());
    }).map((def) => ({
      date,
      player,
      metric: def.key,
      value: def.type === "boolean" ? "yes" : String(metricValues[def.key]),
    }));

    if (!metricEntries.length) {
      setStatus("Enter at least one stat before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await sheetsPost("bulkMetrics", { entries: metricEntries });
      setStatus(`Saved your stats for ${date}!`);
      setMetricValues({});
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">PLAYER ENTRY</h1>
        <p className="text-white/50 text-sm mt-1">
          Pick your name and fill in whatever you did today. Leave anything blank that doesn&apos;t apply.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Your name
        <select
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        >
          <option value="" disabled>
            Select your name...
          </option>
          {players.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm w-48">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-6 border-t border-white/10 pt-4">
        <span className="text-sm text-white/50">My Work Today</span>
        {METRIC_CATEGORIES.map((category) => {
          const defs = METRIC_DEFS.filter((def) => def.category === category);
          if (!defs.length) return null;
          return (
            <div key={category} className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide text-accent">{category}</span>
              {defs.map((def) =>
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
                    {def.unit && <span className="text-white/30 text-xs">{def.unit}</span>}
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
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-5 py-2.5 rounded disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save my stats"}
      </button>

      {status && <p className="text-sm text-white/70">{status}</p>}
    </div>
  );
}
