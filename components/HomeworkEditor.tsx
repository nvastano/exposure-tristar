"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

type Task = { id: string; text: string };
type HomeworkData = { tasks: Task[]; weekOf: string; updatedBy: string; updatedAt: string };

const inputCls = "bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60 text-sm w-full";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function HomeworkEditor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekOf, setWeekOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [meta, setMeta] = useState<{ updatedBy: string; updatedAt: string } | null>(null);

  useEffect(() => {
    (sheetsGet("homework") as Promise<HomeworkData>).then((data) => {
      if (data.tasks?.length) {
        setTasks(data.tasks.map((t) => typeof t === "string" ? { id: newId(), text: t } : t));
        if (data.weekOf) setWeekOf(data.weekOf);
        if (data.updatedAt) setMeta({ updatedBy: data.updatedBy, updatedAt: data.updatedAt });
      } else {
        setTasks([{ id: newId(), text: "" }]);
      }
    }).finally(() => setLoading(false));
  }, []);

  function updateTask(id: string, text: string) {
    setTasks((t) => t.map((task) => task.id === id ? { ...task, text } : task));
  }

  function addTask() {
    setTasks((t) => [...t, { id: newId(), text: "" }]);
  }

  function removeTask(id: string) {
    setTasks((t) => t.filter((task) => task.id !== id));
  }

  async function handleSave() {
    const validTasks = tasks.filter((t) => t.text.trim());
    if (!validTasks.length) return;
    setSaving(true);
    setSaved(false);
    try {
      await sheetsPost("setHomework", {
        tasks: validTasks,
        weekOf,
        updatedBy: "Coach",
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Weekly Homework</p>
        {meta?.updatedAt && (
          <p className="text-xs text-white/30">
            Last updated {new Date(meta.updatedAt).toLocaleDateString()} by {meta.updatedBy || "Coach"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-white/50 font-medium">Week of</label>
        <input
          type="date"
          value={weekOf}
          onChange={(e) => setWeekOf(e.target.value)}
          className={inputCls + " w-44"}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/50 font-medium">Tasks</label>
        {tasks.map((task, i) => (
          <div key={task.id} className="flex items-center gap-2">
            <span className="text-white/20 text-xs w-5 text-right shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={task.text}
              onChange={(e) => updateTask(task.id, e.target.value)}
              placeholder="e.g. 20 dry swings focusing on posture"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => removeTask(task.id)}
              className="text-white/20 hover:text-accent transition-colors text-lg leading-none shrink-0"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTask}
          className="text-sm text-accent/70 hover:text-accent border border-dashed border-accent/30 hover:border-accent/60 rounded-lg py-2 transition-colors"
        >
          + Add task
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-5 py-2.5 rounded disabled:opacity-50"
        >
          {saving ? "Publishing..." : "Publish Homework"}
        </button>
        {saved && <span className="text-sm text-green-400">Published!</span>}
      </div>
    </div>
  );
}
