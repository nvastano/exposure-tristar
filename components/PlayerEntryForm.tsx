"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { METRIC_CATEGORIES, METRIC_DEFS } from "@/lib/metrics";
import { localDateStr } from "@/lib/stats";
import { getRandomQuestion } from "@/lib/trivia";
import TriviaQuestionCard from "@/components/TriviaQuestion";

const TODAY = localDateStr();
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type PlayerRow = { Name: string };
type DrillRow = { Id: string; Name: string };
type Task = { text: string; videoUrl?: string; day?: string };
type Template = { Id: string; Name: string; Tasks: Task[] };
type Assignment = { Id: string; TemplateId: string; PlayerName: string; StartDate: string; EndDate: string };

function toISO(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); } catch {}
  return s;
}

function dayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? "" : DAYS[d.getDay()];
}

export default function PlayerEntryForm({ onSaved }: { onSaved?: () => void }) {
  const [players, setPlayers] = useState<string[]>([]);
  const [player, setPlayer] = useState("");
  const [date, setDate] = useState(TODAY);
  const [metricValues, setMetricValues] = useState<Record<string, string | boolean>>({});
  const [other, setOther] = useState("");
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [drillsDone, setDrillsDone] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const triviaQuestion = useMemo(() => getRandomQuestion(), []);

  const templateMap = useMemo(() => new Map(templates.map(t => [t.Id, t])), [templates]);

  // Active assignments for the selected player on the selected date, with their day-filtered tasks
  const dayAssignments = useMemo(() => {
    if (!player || !date) return [];
    const dow = dayOfWeek(date);
    return assignments
      .filter(a => {
        const start = toISO(a.StartDate);
        const end = toISO(a.EndDate);
        return (
          a.PlayerName.trim().toLowerCase() === player.trim().toLowerCase() &&
          start <= date &&
          (!end || end >= date)
        );
      })
      .map(a => {
        const tmpl = templateMap.get(a.TemplateId);
        if (!tmpl) return null;
        const tasks = tmpl.Tasks.filter(t => !t.day || t.day === dow);
        if (!tasks.length) return null;
        return { name: tmpl.Name, tasks };
      })
      .filter(Boolean) as { name: string; tasks: Task[] }[];
  }, [player, date, assignments, templateMap]);

  useEffect(() => {
    (async () => {
      try {
        const data = (await sheetsGet("players")) as PlayerRow[];
        setPlayers(data.map((p) => p.Name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
      } catch {
        // sheet not connected yet
      }
    })();
    (async () => {
      try {
        const data = (await sheetsGet("drills")) as DrillRow[];
        setDrills(data);
      } catch {
        // sheet not connected yet
      }
    })();
    (async () => {
      try {
        const [t, a] = await Promise.all([
          sheetsGet("assignmentTemplates") as Promise<Template[]>,
          sheetsGet("assignments") as Promise<Assignment[]>,
        ]);
        setTemplates(Array.isArray(t) ? t : []);
        setAssignments(Array.isArray(a) ? a : []);
      } catch {}
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

    if (other.trim()) {
      metricEntries.push({ date, player, metric: "Other", value: other.trim() });
    }

    drills
      .filter((d) => drillsDone[d.Id])
      .forEach((d) => {
        metricEntries.push({ date, player, metric: "Drill", value: d.Name });
      });

    if (!metricEntries.length) {
      setStatus("Enter at least one stat before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await sheetsPost("bulkMetrics", { entries: metricEntries });
      setStatus(`Saved your stats for ${date}!`);
      setMetricValues({});
      setOther("");
      setDrillsDone({});
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
        <h2 className="text-xl font-bold tracking-wide">PLAYER ENTRY</h2>
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

      {player && (
        <TriviaQuestionCard question={triviaQuestion} player={player} />
      )}

      <label className="flex flex-col gap-1 text-sm w-48">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>

      {dayAssignments.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-xs font-bold tracking-widest uppercase text-accent/70">
            Assigned for {dayOfWeek(date)}
          </p>
          {dayAssignments.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1.5">
              {dayAssignments.length > 1 && (
                <p className="text-xs font-semibold text-white/50">{group.name}</p>
              )}
              <ul className="flex flex-col gap-1">
                {group.tasks.map((task, ti) => (
                  <li key={ti} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-accent/50 mt-0.5">·</span>
                    <span className="flex-1">{task.text}</span>
                    {task.videoUrl && (
                      <a href={task.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-accent hover:text-accent/70 shrink-0">▶ Watch</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5 border-t border-white/10 pt-4">
        <span className="text-sm text-white/50">My Work Today</span>
        {METRIC_CATEGORIES.map((category) => {
          const defs = METRIC_DEFS.filter((def) => def.category === category);
          if (!defs.length) return null;
          const numbers = defs.filter(d => d.type === "number");
          const booleans = defs.filter(d => d.type === "boolean");
          return (
            <div key={category} className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-accent">{category}</span>
              {numbers.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {numbers.map((def) => (
                    <label key={def.key} className="flex flex-col gap-1 text-xs text-white/50">
                      {def.label}{def.unit ? ` (${def.unit})` : ""}
                      <input
                        type="number"
                        inputMode="numeric"
                        value={(metricValues[def.key] as string) || ""}
                        onChange={(e) =>
                          setMetricValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                        }
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 w-20 text-sm text-white"
                      />
                    </label>
                  ))}
                </div>
              )}
              {booleans.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {booleans.map((def) => (
                    <label key={def.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metricValues[def.key] === true}
                        onChange={(e) =>
                          setMetricValues((prev) => ({ ...prev, [def.key]: e.target.checked }))
                        }
                        className="w-4 h-4 shrink-0"
                      />
                      {def.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {drills.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-accent">Specialized Drills</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {drills.map((drill) => (
                <label key={drill.Id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(drillsDone[drill.Id])}
                    onChange={(e) =>
                      setDrillsDone((prev) => ({ ...prev, [drill.Id]: e.target.checked }))
                    }
                    className="w-4 h-4 shrink-0"
                  />
                  {drill.Name}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold tracking-wide text-accent">Other</span>
          <span className="text-white/30 text-xs">
            Anything you did that&apos;s not listed above
          </span>
          <textarea
            value={other}
            onChange={(e) => setOther(e.target.value)}
            rows={3}
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          />
        </label>
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
