"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

type Template = { Id: string; Name: string; Tasks: string[] };
type Assignment = { Id: string; TemplateId: string; PlayerName: string; StartDate: string; EndDate: string; Notes: string };
type MetricRow = { Player: string; Metric: string; Value: string; Date: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Sheets may return M/D/YYYY
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return dateStr;
}

function storageKey(assignmentId: string, playerName: string) {
  return `aw_${assignmentId}_${playerName.trim().toLowerCase()}`;
}

function loadChecked(assignmentId: string, playerName: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(assignmentId, playerName));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveChecked(assignmentId: string, playerName: string, checked: Set<string>) {
  try {
    localStorage.setItem(storageKey(assignmentId, playerName), JSON.stringify([...checked]));
  } catch {}
}

type AssignmentCardProps = {
  assignment: Assignment;
  template: Template;
  playerName: string;
  loggedTaskIds: Set<string>;
  onTaskLogged: () => void;
};


function AssignmentCard({ assignment, template, playerName, loggedTaskIds, onTaskLogged }: AssignmentCardProps) {
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(assignment.Id, playerName));

  // Merge localStorage with any tasks already logged to Metrics
  useEffect(() => {
    setChecked(prev => {
      const merged = new Set([...prev, ...loggedTaskIds]);
      saveChecked(assignment.Id, playerName, merged);
      return merged;
    });
  }, [loggedTaskIds, assignment.Id, playerName]);

  async function toggle(taskId: string) {
    const wasChecked = checked.has(taskId);
    const next = new Set(checked);
    wasChecked ? next.delete(taskId) : next.add(taskId);
    setChecked(next);
    saveChecked(assignment.Id, playerName, next);

    if (!wasChecked) {
      // Log to Metrics
      const d = today();
      await sheetsPost("bulkMetrics", {
        entries: [{
          date: d,
          player: playerName,
          metric: "AssignedTask",
          value: `${assignment.Id}:${taskId}`,
        }],
      }).catch(() => {});
      onTaskLogged();
    }
  }

  const doneCount = checked.size;
  const totalCount = template.Tasks.length;
  const allDone = doneCount === totalCount;

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-4 ${allDone ? "border-accent/30 bg-accent/5" : "border-white/10 bg-white/3"}`}>
      {assignment.Notes && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-xs font-bold tracking-widest uppercase text-accent/70 mb-1">From your coach</p>
          <p className="text-sm text-white/80 leading-relaxed">{assignment.Notes}</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-base">{template.Name}</p>
          <p className="text-xs text-white/30 mt-0.5">
            Started {toISO(assignment.StartDate)}
            {assignment.EndDate ? ` · ends ${toISO(assignment.EndDate)}` : " · ongoing"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold tabular-nums ${allDone ? "text-accent" : "text-white/60"}`}>
            {doneCount} / {totalCount}
          </p>
          {allDone && <p className="text-xs text-accent">Complete ✓</p>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {template.Tasks.map((task, i) => {
          const taskId = String(i);
          const done = checked.has(taskId);
          return (
            <button
              key={taskId}
              onClick={() => toggle(taskId)}
              className={`flex items-start gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors ${
                done
                  ? "border-accent/20 bg-accent/8 text-white/60"
                  : "border-white/5 hover:border-white/15 text-white"
              }`}
            >
              <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                done ? "border-accent bg-accent text-white" : "border-white/20"
              }`}>
                {done ? "✓" : ""}
              </span>
              <span className={`text-sm ${done ? "line-through opacity-50" : ""}`}>{task}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  playerName: string;
};

export default function AssignedWorkPlayer({ playerName }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefresh] = useState(0);

  useEffect(() => {
    if (!playerName) { setLoading(false); return; }
    Promise.all([
      sheetsGet("assignmentTemplates") as Promise<Template[]>,
      sheetsGet("assignments") as Promise<Assignment[]>,
      (sheetsGet("metrics") as Promise<MetricRow[]>).catch(() => [] as MetricRow[]),
    ]).then(([t, a, m]) => {
      setTemplates(Array.isArray(t) ? t : []);
      setAssignments(Array.isArray(a) ? a : []);
      setMetrics(Array.isArray(m) ? m : []);
    }).finally(() => setLoading(false));
  }, [playerName]);

  const templateMap = useMemo(() => new Map(templates.map(t => [t.Id, t])), [templates]);

  // Active assignments for this player
  const activeAssignments = useMemo(() => {
    const now = today();
    return assignments.filter(a => {
      const start = toISO(a.StartDate);
      const end = toISO(a.EndDate);
      return (
        a.PlayerName.trim().toLowerCase() === playerName.trim().toLowerCase() &&
        start <= now &&
        (!end || end >= now)
      );
    });
  }, [assignments, playerName]);

  // Tasks already logged to Metrics per assignment
  const loggedByAssignment = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const m of metrics) {
      if (m.Metric === "AssignedTask" && String(m.Player).trim().toLowerCase() === playerName.trim().toLowerCase()) {
        const [assignId, taskId] = String(m.Value).split(":");
        if (!map.has(assignId)) map.set(assignId, new Set());
        map.get(assignId)!.add(taskId);
      }
    }
    return map;
  }, [metrics, playerName]);

  if (!playerName) return null;
  if (loading) return <LogoLoader />;
  if (activeAssignments.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Assigned Work</h2>
      {activeAssignments.map(a => {
        const tmpl = templateMap.get(a.TemplateId);
        if (!tmpl) return null;
        return (
          <AssignmentCard
            key={a.Id}
            assignment={a}
            template={tmpl}
            playerName={playerName}
            loggedTaskIds={loggedByAssignment.get(a.Id) || new Set()}
            onTaskLogged={() => setRefresh(n => n + 1)}
          />
        );
      })}
    </div>
  );
}
