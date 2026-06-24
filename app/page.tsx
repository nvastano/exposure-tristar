"use client";

import { useEffect, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { toEmbedUrl } from "@/lib/drills";
import type { RawDrillRow } from "@/lib/drills";
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";

export default function DrillsPage() {
  const [drills, setDrills] = useState<RawDrillRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { unlocked, setUnlocked } = useCoachUnlocked();

  async function refresh() {
    setLoading(true);
    try {
      const data = (await sheetsGet("drills")) as RawDrillRow[];
      setDrills(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(drill: RawDrillRow) {
    if (!confirm(`Delete "${drill.Name}"?`)) return;
    await sheetsPost("deleteDrill", { id: drill.Id });
    refresh();
  }

  if (loading) {
    return <p className="text-white/50 text-sm">Loading...</p>;
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
          <h2 className="text-xl font-bold tracking-wide">DRILLS</h2>
          <p className="text-white/50 text-sm mt-1">
            Watch how each drill is done before logging it on the Daily Work tab.
          </p>
        </div>
        <div className="flex items-end gap-2 shrink-0">
          <CoachUnlock unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
          {unlocked && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
            >
              + Add Drill
            </button>
          )}
        </div>
      </div>

      {unlocked && adding && (
        <DrillForm
          onCancel={() => setAdding(false)}
          onSave={async (name, description, videoUrl) => {
            await sheetsPost("addDrill", { name, description, videoUrl });
            setAdding(false);
            refresh();
          }}
        />
      )}

      {drills.length === 0 && !adding && (
        <p className="text-white/30 text-sm">No drills posted yet.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {drills.map((drill) => (
          <DrillCard
            key={drill.Id}
            drill={drill}
            canEdit={unlocked}
            onDelete={() => handleDelete(drill)}
            onSave={async (name, description, videoUrl) => {
              await sheetsPost("updateDrill", { id: drill.Id, name, description, videoUrl });
              refresh();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DrillCard({
  drill,
  canEdit,
  onSave,
  onDelete,
}: {
  drill: RawDrillRow;
  canEdit: boolean;
  onSave: (name: string, description: string, videoUrl: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <DrillForm
        initialName={drill.Name}
        initialDescription={drill.Description}
        initialVideoUrl={drill.VideoUrl}
        onCancel={() => setEditing(false)}
        onSave={(name, description, videoUrl) => {
          onSave(name, description, videoUrl);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 p-4 flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded">
        <iframe
          className="w-full h-full"
          src={toEmbedUrl(drill.VideoUrl)}
          title={drill.Name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm">{drill.Name}</span>
          {drill.Description && (
            <p className="text-white/50 text-xs mt-1">{drill.Description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-white/40 hover:text-accent text-xs px-1"
              aria-label="Edit drill"
              title="Edit"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="text-white/40 hover:text-accent text-xs px-1"
              aria-label="Delete drill"
              title="Delete"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DrillForm({
  initialName = "",
  initialDescription = "",
  initialVideoUrl = "",
  onSave,
  onCancel,
}: {
  initialName?: string;
  initialDescription?: string;
  initialVideoUrl?: string;
  onSave: (name: string, description: string, videoUrl: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);

  return (
    <div className="rounded-lg border border-accent/40 p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Drill name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tee Work"
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Video link (YouTube)
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="bg-white/5 border border-white/10 rounded px-3 py-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && videoUrl.trim() && onSave(name.trim(), description.trim(), videoUrl.trim())}
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
