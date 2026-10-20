"use client";

import { useEffect, useRef, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

type Task = { id: string; text: string };
type HomeworkData = { tasks: Task[]; weekOf: string; updatedBy: string; updatedAt: string };

function storageKey(weekOf: string, player: string) {
  return `hw_checked_${weekOf}_${player.trim().toLowerCase()}`;
}

function loadChecked(weekOf: string, player: string): Set<string> {
  if (!player) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(weekOf, player));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveChecked(weekOf: string, player: string, checked: Set<string>) {
  if (!player) return;
  try {
    localStorage.setItem(storageKey(weekOf, player), JSON.stringify([...checked]));
  } catch {}
}

export default function WeeklyHomework({ player }: { player?: string }) {
  const [data, setData] = useState<HomeworkData | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const completionLoggedRef = useRef(false);

  useEffect(() => {
    (sheetsGet("homework") as Promise<HomeworkData>).then((d) => {
      if (d.tasks?.length) {
        const normalized = d.tasks.map((t) =>
          typeof t === "string" ? { id: t, text: t } : t
        );
        setData({ ...d, tasks: normalized });
        setChecked(loadChecked(d.weekOf || "", player || ""));
      }
    }).finally(() => setLoading(false));
  }, []);

  // Reload checked state when player is selected
  useEffect(() => {
    if (data && player) {
      completionLoggedRef.current = false;
      setChecked(loadChecked(data.weekOf || "", player));
    } else if (!player) {
      setChecked(new Set());
    }
  }, [player, data]);

  function toggle(id: string) {
    if (!data || !player) return;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveChecked(data.weekOf || "", player, next);
      // Log completion to Sheets when all tasks are checked off
      if (next.size === data.tasks.length && !completionLoggedRef.current) {
        completionLoggedRef.current = true;
        sheetsPost("logHomeworkCompletion", { player, weekOf: data.weekOf || "" }).catch(() => {});
      }
      return next;
    });
  }

  if (loading || !data || !data.tasks.length) return null;

  const done = data.tasks.filter((t) => checked.has(t.id)).length;
  const total = data.tasks.length;
  const pct = Math.round((done / total) * 100);

  let weekLabel: string | null = null;
  if (data.weekOf) {
    // weekOf may be "YYYY-MM-DD" or a full ISO string or a Google Sheets serial
    const raw = String(data.weekOf).trim();
    // Try parsing as-is first; if bare date add noon to avoid TZ shift
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T12:00:00" : raw);
    weekLabel = isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase">My Weekly Homework</h2>
          {weekLabel && <p className="text-xs text-white/25 mt-0.5">Week of {weekLabel}</p>}
        </div>
        <span className="text-xs font-semibold text-white/40">
          {done}/{total} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {data.tasks.map((task) => {
          const isChecked = checked.has(task.id);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              disabled={!player}
              className={`flex items-start gap-3 text-left rounded-lg px-3 py-2.5 border transition-colors disabled:cursor-not-allowed ${
                isChecked
                  ? "bg-accent/10 border-accent/30 text-white/40"
                  : "bg-white/3 border-white/8 text-white hover:border-white/20"
              }`}
            >
              <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isChecked ? "bg-accent border-accent" : "border-white/20"
              }`}>
                {isChecked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className={`text-sm leading-snug ${isChecked ? "line-through" : ""}`}>
                {task.text}
              </span>
            </button>
          );
        })}
      </div>

      {done === total && (
        <div className="text-center text-sm text-accent font-semibold py-2">
          All done! Great work this week 💪
        </div>
      )}
    </div>
  );
}
