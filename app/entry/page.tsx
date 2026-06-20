"use client";

import { useState } from "react";
import { parseQuickPaste } from "@/lib/parse";

const TODAY = new Date().toISOString().slice(0, 10);

const SAMPLE = `Cafrey - 4.53; 4.43; 4.78 / 50; 48
Mac - 4.18; 4.43; 4.65 / 47; 47
HUD - 4.21; 4.45; 4.26 / 54; 54
Tristen - 5.13; 5.33; 5.11 / 53; 52
Jeremiah - 4.65; 4.83; 4.71 / 33; 50
Grady - 4.63; 4.70; 4.61 / 55; 58
Isaiah - 4.86; 4.86; 4.83 / 40; 40
Greyson - 4.60; 4.31; 4.43 / 48; 51
Bryson - n/a`;

export default function EntryPage() {
  const [date, setDate] = useState(TODAY);
  const [text, setText] = useState(SAMPLE);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = parseQuickPaste(text);

  async function handleSubmit() {
    setSubmitting(true);
    setStatus(null);
    try {
      const entries = preview
        .filter((p) => p.sprintTimes.length || p.throwVelos.length)
        .map((p) => ({ ...p, date }));

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      setStatus(`Saved ${entries.length} player session(s) for ${date}.`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">COACH ENTRY</h1>
        <p className="text-white/50 text-sm mt-1">
          Paste today&apos;s times in the format{" "}
          <code className="text-accent">Name - sprint1; sprint2; sprint3 / throw1; throw2</code>. Use{" "}
          <code className="text-accent">n/a</code> for players with no data today.
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

      <label className="flex flex-col gap-1 text-sm">
        Quick paste
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="bg-white/5 border border-white/10 rounded px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="rounded-lg border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left px-4 py-2">Player</th>
              <th className="text-left px-4 py-2">Sprint times</th>
              <th className="text-left px-4 py-2">Throw velos</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((p, i) => (
              <tr key={i} className="border-t border-white/10">
                <td className="px-4 py-2">{p.player}</td>
                <td className="px-4 py-2 font-mono">
                  {p.sprintTimes.length ? p.sprintTimes.join(", ") : "—"}
                </td>
                <td className="px-4 py-2 font-mono">
                  {p.throwVelos.length ? p.throwVelos.join(", ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
