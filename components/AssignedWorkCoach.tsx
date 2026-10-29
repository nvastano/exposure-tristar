"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

type Template = { Id: string; Name: string; Tasks: string[]; CreatedAt: string };
type Assignment = { Id: string; TemplateId: string; PlayerName: string; StartDate: string; EndDate: string; Notes: string; CreatedAt: string };
type PlayerRow = { Id: string; Name: string };

const ARM_CARE_TASKS = [
  // MONDAY — Recovery + Mobility (no throwing or hard upper-body)
  "MON · Easy walk or marching in place | 3 min",
  "MON · Small and large arm circles, both directions | 2×10",
  "MON · Gentle shoulder blade squeezes | 2×10",
  "MON · Thoracic open-book rotations, each side | 1×8",
  "MON · Cat-cow mobility | 1×10",
  "MON · Easy child's pose breathing / stretch | 2 min",
  // TUESDAY — Rotator Cuff + Back (lightest band, perfect control)
  "TUE · March/jog in place + shoulder circles | 2 min",
  "TUE · Band external rotation, elbows at sides | 2×10/arm",
  "TUE · Band internal rotation, elbows at sides | 2×10/arm",
  "TUE · Band rows, elbows close to body | 2×12",
  "TUE · Band pull-aparts at chest height | 2×10",
  "TUE · Front plank | 2×20 sec",
  // WEDNESDAY — Scapular Stability + Core
  "WED · Easy movement + arm circles | 2 min",
  "WED · Wall slides (pain-free range) | 2×10",
  "WED · Wall push-ups (slow) | 2×10",
  "WED · Band rows | 2×10",
  "WED · Bird-dogs, each side | 2×8",
  "WED · Side plank, each side | 2×15 sec",
  // THURSDAY — Forearm + Shoulder Control
  "THU · Easy warm-up + arm circles | 2 min",
  "THU · Band external rotations | 2×10/arm",
  "THU · Band internal rotations | 2×10/arm",
  "THU · Wrist extension against very light band | 1×12/arm",
  "THU · Forearm palm-up / palm-down rotations (no weight) | 2×10/arm",
  "THU · Wall slides | 1×10",
  "THU · Dead bugs, each side | 2×8",
  // FRIDAY — Light Pre-Game Activation (no burnout or max-effort)
  "FRI · Easy march / walk + shoulder circles | 3 min",
  "FRI · Band rows | 1×10",
  "FRI · Band external rotation | 1×10/arm",
  "FRI · Band pull-aparts | 1×10",
  "FRI · Wall slides | 1×8",
  "FRI · Bird-dogs, each side | 1×8",
  "FRI · Easy breathing + mobility | 2 min",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return dateStr;
}

export default function AssignedWorkCoach() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTasks, setTemplateTasks] = useState<string[]>([""]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignPlayers, setAssignPlayers] = useState<Set<string>>(new Set());
  const [assignStart, setAssignStart] = useState(today());
  const [assignEnd, setAssignEnd] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  async function load() {
    const [t, a, p] = await Promise.all([
      sheetsGet("assignmentTemplates") as Promise<Template[]>,
      sheetsGet("assignments") as Promise<Assignment[]>,
      sheetsGet("players") as Promise<PlayerRow[]>,
    ]);
    setTemplates(Array.isArray(t) ? t : []);
    setAssignments(Array.isArray(a) ? a : []);
    setPlayers(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function seedArmCare() {
    await sheetsPost("saveAssignmentTemplate", { name: "Arm Care", tasks: ARM_CARE_TASKS });
    await load();
  }

  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateTasks([""]);
    setShowTemplateEditor(true);
  }

  function openEditTemplate(t: Template) {
    setEditingTemplate(t);
    setTemplateName(t.Name);
    setTemplateTasks([...t.Tasks, ""]);
    setShowTemplateEditor(true);
  }

  async function saveTemplate() {
    const tasks = templateTasks.map(s => s.trim()).filter(Boolean);
    if (!templateName.trim() || tasks.length === 0) return;
    setSavingTemplate(true);
    if (editingTemplate) {
      await sheetsPost("saveAssignmentTemplate", { id: editingTemplate.Id, name: templateName.trim(), tasks });
    } else {
      await sheetsPost("saveAssignmentTemplate", { name: templateName.trim(), tasks });
    }
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateTasks([""]);
    setShowTemplateEditor(false);
    setSavingTemplate(false);
    await load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? Existing assignments will remain but the template cannot be reused.")) return;
    await sheetsPost("deleteAssignmentTemplate", { id });
    await load();
  }

  async function saveAssignment() {
    if (!assignTemplateId || assignPlayers.size === 0 || !assignStart) return;
    setSavingAssignment(true);
    await Promise.all([...assignPlayers].map(p =>
      sheetsPost("createAssignment", {
        templateId: assignTemplateId,
        playerName: p,
        startDate: assignStart,
        endDate: assignEnd,
        notes: assignNotes,
      })
    ));
    setShowAssignForm(false);
    setAssignTemplateId("");
    setAssignPlayers(new Set());
    setAssignStart(today());
    setAssignEnd("");
    setAssignNotes("");
    setSavingAssignment(false);
    await load();
  }

  async function deleteAssignment(id: string) {
    if (!confirm("Remove this assignment?")) return;
    await sheetsPost("deleteAssignment", { id });
    await load();
  }

  if (loading) return <LogoLoader />;

  const templateMap = new Map(templates.map(t => [t.Id, t]));

  const isEditing = showTemplateEditor;

  return (
    <div className="flex flex-col gap-8">

      {/* Templates section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Work Templates</h2>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <button
                onClick={seedArmCare}
                className="text-xs border border-white/10 text-white/40 hover:text-white/70 px-3 py-1.5 rounded transition-colors"
              >
                + Add Arm Care
              </button>
            )}
            <button
              onClick={openNewTemplate}
              className="text-xs border border-accent/40 text-accent hover:bg-accent/10 px-3 py-1.5 rounded transition-colors"
            >
              + New Template
            </button>
          </div>
        </div>

        {/* Template editor */}
        {isEditing && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40">
              {editingTemplate ? "Edit Template" : "New Template"}
            </p>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. Arm Care)"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/30">Tasks</p>
              {templateTasks.map((task, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={e => {
                      const next = [...templateTasks];
                      next[i] = e.target.value;
                      // auto-add blank row at end
                      if (i === templateTasks.length - 1 && e.target.value) next.push("");
                      setTemplateTasks(next);
                    }}
                    placeholder={`Task ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
                  />
                  {templateTasks.length > 1 && (
                    <button
                      onClick={() => setTemplateTasks(templateTasks.filter((_, j) => j !== i))}
                      className="text-white/20 hover:text-accent px-2 text-lg leading-none"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="bg-accent hover:bg-accent/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors disabled:opacity-40"
              >
                {savingTemplate ? "Saving…" : "Save Template"}
              </button>
              <button
                onClick={() => { setEditingTemplate(null); setTemplateName(""); setTemplateTasks([""]); setShowTemplateEditor(false); }}
                className="text-sm text-white/40 hover:text-white px-4 py-2 rounded border border-white/10 transition-colors"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Template list */}
        <div className="flex flex-col gap-2">
          {templates.map(t => (
            <div key={t.Id} className="rounded-lg border border-white/10 bg-white/3 p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">{t.Name}</p>
                <p className="text-xs text-white/30 mt-0.5">{t.Tasks.length} task{t.Tasks.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEditTemplate(t)} className="text-xs text-white/40 hover:text-white underline">Edit</button>
                <button onClick={() => deleteTemplate(t.Id)} className="text-xs text-white/40 hover:text-accent underline">Delete</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && !isEditing && (
            <p className="text-white/30 text-sm py-4 text-center">No templates yet. Create one above or add the Arm Care template.</p>
          )}
        </div>
      </section>

      {/* Assignments section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Assignments</h2>
          <button
            onClick={() => setShowAssignForm(v => !v)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${showAssignForm ? "border-accent/40 text-accent bg-accent/10" : "border-accent/40 text-accent hover:bg-accent/10"}`}
          >
            + Assign Work
          </button>
        </div>

        {showAssignForm && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40">New Assignment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/30">Template</label>
                <select
                  value={assignTemplateId}
                  onChange={e => setAssignTemplateId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60"
                >
                  <option value="">Select template…</option>
                  {templates.map(t => <option key={t.Id} value={t.Id}>{t.Name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/30">Players</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAssignPlayers(new Set(players.map(p => p.Name)))}
                      className="text-xs text-accent hover:underline"
                    >All</button>
                    <button
                      type="button"
                      onClick={() => setAssignPlayers(new Set())}
                      className="text-xs text-white/40 hover:text-white hover:underline"
                    >None</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {players.map(p => {
                    const on = assignPlayers.has(p.Name);
                    return (
                      <button
                        key={p.Id}
                        type="button"
                        onClick={() => {
                          const next = new Set(assignPlayers);
                          on ? next.delete(p.Name) : next.add(p.Name);
                          setAssignPlayers(next);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${on ? "border-accent/40 bg-accent/10 text-white" : "border-white/10 text-white/40 hover:text-white/70"}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center text-[10px] ${on ? "border-accent bg-accent text-white" : "border-white/20"}`}>
                          {on ? "✓" : ""}
                        </span>
                        {p.Name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/30">Start Date</label>
                <input type="date" value={assignStart} onChange={e => setAssignStart(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/30">End Date (optional)</label>
                <input type="date" value={assignEnd} onChange={e => setAssignEnd(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60" />
              </div>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-white/30">Instructions for player (optional)</label>
              <textarea
                value={assignNotes}
                onChange={e => setAssignNotes(e.target.value)}
                placeholder="e.g. Focus on slow, controlled reps. Stop if you feel any elbow pain."
                rows={3}
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 resize-none"
              />
            </div>

            {assignTemplateId && (
              <div className="rounded-lg border border-white/5 bg-white/2 p-3 sm:col-span-2">
                <p className="text-xs text-white/30 mb-2">Tasks in this template:</p>
                <ul className="flex flex-col gap-1">
                  {(templateMap.get(assignTemplateId)?.Tasks || []).map((task, i) => (
                    <li key={i} className="text-sm text-white/70 flex gap-2">
                      <span className="text-white/20">{i + 1}.</span>{task}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={saveAssignment}
                disabled={savingAssignment || !assignTemplateId || assignPlayers.size === 0 || !assignStart}
                className="bg-accent hover:bg-accent/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors disabled:opacity-40"
              >
                {savingAssignment ? "Saving…" : `Assign to ${assignPlayers.size} player${assignPlayers.size !== 1 ? "s" : ""}`}
              </button>
              <button onClick={() => setShowAssignForm(false)} className="text-sm text-white/40 hover:text-white px-4 py-2 rounded border border-white/10 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {assignments.length === 0 && (
            <p className="text-white/30 text-sm py-4 text-center">No assignments yet.</p>
          )}
          {assignments.map(a => {
            const tmpl = templateMap.get(a.TemplateId);
            const isActive = !a.EndDate || toISO(a.EndDate) >= today();
            return (
              <div key={a.Id} className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${isActive ? "border-white/10 bg-white/3" : "border-white/5 bg-white/1 opacity-50"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{a.PlayerName}</span>
                    <span className="text-xs text-white/30">—</span>
                    <span className="text-sm text-white/70">{tmpl?.Name || "Unknown template"}</span>
                    {!isActive && <span className="text-xs text-white/30 italic">ended</span>}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {toISO(a.StartDate)}{a.EndDate ? ` → ${toISO(a.EndDate)}` : " (ongoing)"}
                    {tmpl && ` · ${tmpl.Tasks.length} tasks`}
                  </p>
                  {a.Notes && <p className="text-xs text-white/40 italic mt-1">"{a.Notes}"</p>}
                </div>
                <button onClick={() => deleteAssignment(a.Id)} className="text-xs text-white/30 hover:text-accent underline shrink-0">Remove</button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
