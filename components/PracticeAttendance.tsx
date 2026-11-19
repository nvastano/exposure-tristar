"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string };
type PracticeSession = { Id: string; Date: string; Label: string; CreatedAt: string };
type AttendanceRow = { Id: string; SessionId: string; PlayerName: string; Present: string; Reason: string };

type AttendanceRecord = { playerName: string; present: boolean; reason: string };

function toISO(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); } catch {}
  return s;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

export default function PracticeAttendance() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Log practice form state
  const [showForm, setShowForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLabel, setFormLabel] = useState("");
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [saving, setSaving] = useState(false);

  // View toggle
  const [view, setView] = useState<"log" | "grid">("log");

  async function load() {
    const [p, s, a] = await Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      sheetsGet("practiceSessions") as Promise<PracticeSession[]>,
      sheetsGet("practiceAttendance") as Promise<AttendanceRow[]>,
    ]);
    setPlayers(Array.isArray(p) ? p.filter(r => r.Name) : []);
    setSessions(Array.isArray(s) ? s : []);
    setAttendance(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openForm() {
    setEditingSessionId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormLabel("");
    setGuests([]);
    setGuestInput("");
    const init: Record<string, AttendanceRecord> = {};
    players.forEach(p => { init[p.Name] = { playerName: p.Name, present: true, reason: "" }; });
    setRecords(init);
    setShowForm(true);
  }

  function openEditForm(session: PracticeSession) {
    setEditingSessionId(session.Id);
    setFormDate(toISO(session.Date));
    setFormLabel(session.Label || "");
    setGuestInput("");

    const rosterNames = new Set(players.map(p => p.Name.trim().toLowerCase()));
    const sessionRecs = attendanceMap.get(session.Id);
    const init: Record<string, AttendanceRecord> = {};
    const detectedGuests: string[] = [];

    // Pre-fill roster players from saved attendance, default to present if no record
    players.forEach(p => {
      const saved = sessionRecs?.get(p.Name.trim().toLowerCase());
      init[p.Name] = { playerName: p.Name, present: saved ? saved.Present === "yes" : true, reason: saved?.Reason || "" };
    });

    // Detect guest players (in attendance but not on roster)
    if (sessionRecs) {
      for (const rec of sessionRecs.values()) {
        if (!rosterNames.has(rec.PlayerName.trim().toLowerCase())) {
          detectedGuests.push(rec.PlayerName);
          init[rec.PlayerName] = { playerName: rec.PlayerName, present: rec.Present === "yes", reason: rec.Reason || "" };
        }
      }
    }

    setGuests(detectedGuests);
    setRecords(init);
    setShowForm(true);
  }

  function addGuest() {
    const name = guestInput.trim();
    if (!name || guests.includes(name)) return;
    setGuests(prev => [...prev, name]);
    setRecords(prev => ({ ...prev, [name]: { playerName: name, present: true, reason: "" } }));
    setGuestInput("");
  }

  function removeGuest(name: string) {
    setGuests(prev => prev.filter(g => g !== name));
    setRecords(prev => { const next = { ...prev }; delete next[name]; return next; });
  }

  async function saveSession() {
    setSaving(true);
    const allNames = [...players.map(p => p.Name), ...guests];
    try {
      let sessionId = editingSessionId;
      if (!sessionId) {
        const { id } = await sheetsPost("createPracticeSession", { date: formDate, label: formLabel.trim() }) as { id: string };
        sessionId = id;
      } else {
        await sheetsPost("updatePracticeSession", { id: sessionId, date: formDate, label: formLabel.trim() });
      }
      await sheetsPost("saveAttendance", {
        sessionId,
        records: allNames.map(name => records[name] || { playerName: name, present: true, reason: "" }),
      });
      setShowForm(false);
      setEditingSessionId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this practice record? This cannot be undone.")) return;
    await sheetsPost("deletePracticeSession", { id });
    await load();
  }

  // Build a map: sessionId -> playerName -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceRow>>();
    for (const r of attendance) {
      if (!map.has(r.SessionId)) map.set(r.SessionId, new Map());
      map.get(r.SessionId)!.set(r.PlayerName.trim().toLowerCase(), r);
    }
    return map;
  }, [attendance]);

  // Sessions sorted newest first
  const sortedSessions = useMemo(() =>
    [...sessions].sort((a, b) => toISO(b.Date).localeCompare(toISO(a.Date))),
    [sessions]
  );

  // Attendance rate per player across all sessions
  const playerStats = useMemo(() => {
    return players.map(p => {
      const key = p.Name.trim().toLowerCase();
      let present = 0, total = 0;
      for (const session of sessions) {
        const rec = attendanceMap.get(session.Id)?.get(key);
        if (rec) { total++; if (rec.Present === "yes") present++; }
      }
      return { name: p.Name, present, total };
    });
  }, [players, sessions, attendanceMap]);

  if (loading) return <LogoLoader />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Practice Attendance</h2>
          <p className="text-white/30 text-sm mt-0.5">{sessions.length} practice{sessions.length !== 1 ? "s" : ""} logged</p>
        </div>
        <div className="flex gap-2">
          {sessions.length > 0 && (
            <div className="flex rounded overflow-hidden border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setView("log")}
                className={`px-3 py-1.5 transition-colors ${view === "log" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
              >Log</button>
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 transition-colors ${view === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
              >Grid</button>
            </div>
          )}
          <button
            onClick={openForm}
            className="text-xs border border-accent/40 text-accent hover:bg-accent/10 px-3 py-1.5 rounded transition-colors"
          >
            + Log Practice
          </button>
        </div>
      </div>

      {/* Log practice form */}
      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-5">
          <p className="text-xs font-bold tracking-widest uppercase text-white/40">{editingSessionId ? "Edit Practice" : "New Practice"}</p>

          <div className="flex gap-3 flex-wrap">
            <label className="flex flex-col gap-1 text-xs text-white/40">
              Date
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/40 flex-1 min-w-48">
              Label (optional)
              <input
                type="text"
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="e.g. Scrimmage vs. Lincoln"
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/40">Attendance</p>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...records };
                    players.forEach(p => { next[p.Name] = { ...next[p.Name], playerName: p.Name, present: true }; });
                    setRecords(next);
                  }}
                  className="text-accent hover:underline"
                >All present</button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {players.map(p => {
                const rec = records[p.Name] || { playerName: p.Name, present: true, reason: "" };
                return (
                  <div key={p.Name} className={`rounded-lg border p-3 flex flex-col gap-2 transition-colors ${rec.present ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{p.Name}</span>
                      <div className="flex rounded overflow-hidden border border-white/10 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setRecords(prev => ({ ...prev, [p.Name]: { ...prev[p.Name], playerName: p.Name, present: true } }))}
                          className={`px-3 py-1 transition-colors ${rec.present ? "bg-green-500/30 text-green-300" : "text-white/30 hover:text-white/60"}`}
                        >Present</button>
                        <button
                          type="button"
                          onClick={() => setRecords(prev => ({ ...prev, [p.Name]: { ...prev[p.Name], playerName: p.Name, present: false } }))}
                          className={`px-3 py-1 transition-colors ${!rec.present ? "bg-red-500/30 text-red-300" : "text-white/30 hover:text-white/60"}`}
                        >Absent</button>
                      </div>
                    </div>
                    {!rec.present && (
                      <input
                        type="text"
                        value={rec.reason}
                        onChange={e => setRecords(prev => ({ ...prev, [p.Name]: { ...prev[p.Name], reason: e.target.value } }))}
                        placeholder="Reason (e.g. notified on GroupMe — sick)"
                        className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/40"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guest players */}
          <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
            <p className="text-xs text-white/40">Guest Players</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={guestInput}
                onChange={e => setGuestInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } }}
                placeholder="Guest name..."
                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
              />
              <button
                type="button"
                onClick={addGuest}
                disabled={!guestInput.trim()}
                className="text-xs border border-accent/40 text-accent hover:bg-accent/10 px-3 py-1.5 rounded transition-colors disabled:opacity-30"
              >Add</button>
            </div>
            {guests.length > 0 && (
              <div className="flex flex-col gap-2">
                {guests.map(name => {
                  const rec = records[name] || { playerName: name, present: true, reason: "" };
                  return (
                    <div key={name} className={`rounded-lg border p-3 flex flex-col gap-2 transition-colors ${rec.present ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">Guest</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex rounded overflow-hidden border border-white/10 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setRecords(prev => ({ ...prev, [name]: { ...prev[name], playerName: name, present: true } }))}
                              className={`px-3 py-1 transition-colors ${rec.present ? "bg-green-500/30 text-green-300" : "text-white/30 hover:text-white/60"}`}
                            >Present</button>
                            <button
                              type="button"
                              onClick={() => setRecords(prev => ({ ...prev, [name]: { ...prev[name], playerName: name, present: false } }))}
                              className={`px-3 py-1 transition-colors ${!rec.present ? "bg-red-500/30 text-red-300" : "text-white/30 hover:text-white/60"}`}
                            >Absent</button>
                          </div>
                          <button onClick={() => removeGuest(name)} className="text-white/20 hover:text-accent text-lg leading-none px-1">×</button>
                        </div>
                      </div>
                      {!rec.present && (
                        <input
                          type="text"
                          value={rec.reason}
                          onChange={e => setRecords(prev => ({ ...prev, [name]: { ...prev[name], reason: e.target.value } }))}
                          placeholder="Reason (optional)"
                          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/40"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveSession}
              disabled={saving || !formDate}
              className="bg-accent hover:bg-accent/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : editingSessionId ? "Update Practice" : "Save Practice"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-white/40 hover:text-white px-4 py-2 rounded border border-white/10 transition-colors"
            >Cancel</button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <p className="text-white/30 text-sm text-center py-8">No practices logged yet. Click + Log Practice to start.</p>
      )}

      {/* Grid view */}
      {!showForm && view === "grid" && sessions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left px-3 py-2.5 text-white/40 font-semibold sticky left-0 bg-[#0d0d0d] min-w-32 border-r border-white/10">
                  Player
                </th>
                <th className="px-3 py-2.5 text-white/40 font-semibold whitespace-nowrap">
                  Total
                </th>
                {sortedSessions.map(s => (
                  <th key={s.Id} className="px-3 py-2 text-white/30 font-normal whitespace-nowrap text-center">
                    <div>{formatDate(toISO(s.Date))}</div>
                    {s.Label && <div className="text-white/20 font-normal">{s.Label}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerStats.map(stat => (
                <tr key={stat.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-3 py-2.5 font-semibold sticky left-0 bg-[#0d0d0d] border-r border-white/10 whitespace-nowrap">
                    {stat.name}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    <span className={`font-bold ${stat.total > 0 && stat.present / stat.total >= 0.8 ? "text-green-400" : stat.total > 0 ? "text-yellow-400" : "text-white/30"}`}>
                      {stat.total > 0 ? `${stat.present}/${stat.total}` : "—"}
                    </span>
                  </td>
                  {sortedSessions.map(s => {
                    const rec = attendanceMap.get(s.Id)?.get(stat.name.trim().toLowerCase());
                    if (!rec) return <td key={s.Id} className="px-3 py-2.5 text-center text-white/15">—</td>;
                    const present = rec.Present === "yes";
                    return (
                      <td key={s.Id} className="px-3 py-2.5 text-center">
                        {present
                          ? <span className="text-green-400 font-bold">✓</span>
                          : (
                            <span
                              className="text-red-400 font-bold cursor-help"
                              title={rec.Reason || "Absent"}
                            >✗</span>
                          )
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log view — list of past practices */}
      {!showForm && view === "log" && sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sortedSessions.map(s => {
            const sessionRecs = attendanceMap.get(s.Id);
            const presentCount = sessionRecs
              ? Array.from(sessionRecs.values()).filter(r => r.Present === "yes").length
              : 0;
            const totalCount = sessionRecs ? sessionRecs.size : 0;
            const absentRecs = sessionRecs
              ? Array.from(sessionRecs.values()).filter(r => r.Present !== "yes")
              : [];

            return (
              <div key={s.Id} className="rounded-xl border border-white/10 bg-white/3 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {formatDate(toISO(s.Date))}
                      {s.Label && <span className="text-white/40 font-normal ml-2">· {s.Label}</span>}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {presentCount} of {totalCount} present
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEditForm(s)}
                      className="text-xs text-white/30 hover:text-white transition-colors"
                    >Edit</button>
                    <button
                      onClick={() => deleteSession(s.Id)}
                      className="text-xs text-white/20 hover:text-accent transition-colors"
                    >Delete</button>
                  </div>
                </div>

                {absentRecs.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">Absent</p>
                    {absentRecs.map(r => (
                      <div key={r.Id} className="flex items-start gap-2 text-sm">
                        <span className="text-red-400/70 shrink-0 mt-0.5">✗</span>
                        <span className="font-medium shrink-0">{r.PlayerName}</span>
                        {r.Reason && <span className="text-white/40 text-xs mt-0.5">— {r.Reason}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
