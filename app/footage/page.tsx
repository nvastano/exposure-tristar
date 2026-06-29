"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { toEmbedUrl } from "@/lib/drills";
import { formatDate } from "@/lib/stats";
import type { RawFootageRow, RawFootageNoteRow } from "@/lib/footage";
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string };

export default function FootagePage() {
  const [footage, setFootage] = useState<RawFootageRow[]>([]);
  const [notes, setNotes] = useState<RawFootageNoteRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { unlocked, setUnlocked } = useCoachUnlocked();

  const UNDATED = "Undated";

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const item of footage) set.add(item.Date ? formatDate(item.Date) : UNDATED);
    return Array.from(set).sort((a, b) => {
      if (a === UNDATED) return 1;
      if (b === UNDATED) return -1;
      return b.localeCompare(a);
    });
  }, [footage]);

  useEffect(() => {
    if (dates.length === 0) {
      setSelectedDate(null);
    } else if (!selectedDate || !dates.includes(selectedDate)) {
      setSelectedDate(dates[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const visibleFootage = useMemo(
    () => footage.filter((item) => (item.Date ? formatDate(item.Date) : UNDATED) === selectedDate),
    [footage, selectedDate]
  );

  async function refresh() {
    setLoading(true);
    try {
      const [footageData, noteData, playerData] = await Promise.all([
        sheetsGet("footage") as Promise<RawFootageRow[]>,
        sheetsGet("footageNotes") as Promise<RawFootageNoteRow[]>,
        sheetsGet("players") as Promise<PlayerRow[]>,
      ]);
      setFootage(
        [...footageData].sort((a, b) => (b.CreatedAt || "").localeCompare(a.CreatedAt || ""))
      );
      setNotes(noteData);
      setPlayers([...playerData].sort((a, b) => a.Name.localeCompare(b.Name)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDeleteFootage(item: RawFootageRow) {
    if (!confirm(`Delete "${item.Title}"?`)) return;
    await sheetsPost("deleteFootage", { id: item.Id });
    refresh();
  }

  async function handleDeleteNote(id: string) {
    if (!confirm("Delete this callout?")) return;
    await sheetsPost("deleteFootageNote", { id });
    refresh();
  }

  if (loading) {
    return <LogoLoader />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
        <p className="font-semibold mb-1">Sheet not connected yet</p>
        <p className="text-white/70">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide">PRACTICE FOOTAGE</h2>
          <p className="text-white/50 text-sm mt-1">
            Clips from practice — coaches can call out players by name on anything they notice.
          </p>
        </div>
        <div className="flex items-end gap-2 shrink-0">
          <CoachUnlock unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
          {unlocked && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
            >
              + Add Clip
            </button>
          )}
        </div>
      </div>

      {unlocked && adding && (
        <FootageForm
          onCancel={() => setAdding(false)}
          onSave={async (title, videoUrl, date) => {
            await sheetsPost("addFootage", { title, videoUrl, date });
            setAdding(false);
            refresh();
          }}
        />
      )}

      {footage.length === 0 ? (
        <p className="text-white/30 text-sm">No clips uploaded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                  selectedDate === date
                    ? "bg-accent text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {date}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleFootage.map((item) => (
              <FootageCard
                key={item.Id}
                item={item}
                notes={notes.filter((n) => n.FootageId === item.Id)}
                players={players}
                canEdit={unlocked}
                onDelete={() => handleDeleteFootage(item)}
                onDeleteNote={handleDeleteNote}
                onAddNote={async (selectedPlayers, note) => {
                  await sheetsPost("addFootageNote", { footageId: item.Id, players: selectedPlayers, note });
                  refresh();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FootageCard({
  item,
  notes,
  players,
  canEdit,
  onDelete,
  onDeleteNote,
  onAddNote,
}: {
  item: RawFootageRow;
  notes: RawFootageNoteRow[];
  players: PlayerRow[];
  canEdit: boolean;
  onDelete: () => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (players: string[], note: string) => void;
}) {
  const [addingNote, setAddingNote] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, RawFootageNoteRow[]>();
    for (const n of notes) {
      const key = n.GroupId || n.Id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return Array.from(map.values());
  }, [notes]);

  return (
    <div className="rounded-lg border border-white/10 p-4 flex flex-col gap-3">
      <div className="aspect-[9/16] w-full overflow-hidden rounded">
        <iframe
          className="w-full h-full"
          src={toEmbedUrl(item.VideoUrl)}
          title={item.Title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm">{item.Title}</span>
          {item.Date && <p className="text-white/30 text-xs mt-1">{formatDate(item.Date)}</p>}
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            className="text-white/40 hover:text-accent text-xs px-1"
            aria-label="Delete clip"
            title="Delete"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group[0].Id} className="flex items-center gap-2 text-sm text-white/80">
            <span className="font-semibold text-accent">
              {group.map((n) => n.Player).join(", ")}:
            </span>
            <span>{group[0].Note}</span>
            {canEdit && (
              <button
                onClick={() => onDeleteNote(group[0].Id)}
                className="text-white/30 hover:text-accent"
                aria-label="Delete callout"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {canEdit && !addingNote && (
          <button
            onClick={() => setAddingNote(true)}
            className="text-accent text-xs font-semibold text-left hover:underline"
          >
            + Call out a player
          </button>
        )}

        {canEdit && addingNote && (
          <NoteForm
            players={players}
            onCancel={() => setAddingNote(false)}
            onSave={(selectedPlayers, note) => {
              onAddNote(selectedPlayers, note);
              setAddingNote(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function NoteForm({
  players,
  onCancel,
  onSave,
}: {
  players: PlayerRow[];
  onCancel: () => void;
  onSave: (players: string[], note: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(players[0] ? [players[0].Name] : []);
  const [note, setNote] = useState("");

  function toggle(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-accent/40 p-3">
      <div className="flex flex-col gap-1 text-sm">
        Players
        <div className="flex flex-wrap gap-3 bg-white/5 border border-white/10 rounded px-3 py-2 max-h-32 overflow-y-auto">
          {players.map((p) => (
            <label key={p.Id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(p.Name)}
                onChange={() => toggle(p.Name)}
              />
              {p.Name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Callout
        <input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Great extension on this throw"
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => selected.length > 0 && note.trim() && onSave(selected, note.trim())}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-white/40 hover:text-white text-sm px-2 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function FootageForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (title: string, videoUrl: string, date: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [date, setDate] = useState("");

  return (
    <div className="rounded-lg border border-accent/40 p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Infield work 6/29"
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Video link (Google Drive, YouTube, etc.)
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Date (optional)
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => title.trim() && videoUrl.trim() && onSave(title.trim(), videoUrl.trim(), date)}
          className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-white/40 hover:text-white text-sm px-2 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
