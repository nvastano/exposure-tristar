"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { toEmbedUrl, UNCATEGORIZED } from "@/lib/drills";
import type { RawDrillRow, RawDrillCategoryRow } from "@/lib/drills";
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";

type Columns = Record<string, RawDrillRow[]>;

export default function DrillsPage() {
  const [categories, setCategories] = useState<RawDrillCategoryRow[]>([]);
  const [columns, setColumns] = useState<Columns>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { unlocked, setUnlocked } = useCoachUnlocked();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function refresh() {
    setLoading(true);
    try {
      const [drillData, categoryData] = await Promise.all([
        sheetsGet("drills") as Promise<RawDrillRow[]>,
        sheetsGet("drillCategories") as Promise<RawDrillCategoryRow[]>,
      ]);
      const sortedCategories = [...categoryData].sort(
        (a, b) => Number(a.Order ?? 0) - Number(b.Order ?? 0)
      );
      setCategories(sortedCategories);

      const cols: Columns = {};
      for (const cat of sortedCategories) cols[cat.Id] = [];
      cols[UNCATEGORIZED] = [];
      for (const d of drillData) {
        const catId = d.Category && cols[d.Category] ? d.Category : UNCATEGORIZED;
        cols[catId].push(d);
      }
      for (const key of Object.keys(cols)) {
        cols[key].sort((a, b) => Number(a.Order ?? 0) - Number(b.Order ?? 0));
      }
      setColumns(cols);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function persistOrder(cols: Columns) {
    const order: { id: string; category: string; order: number }[] = [];
    for (const [catId, items] of Object.entries(cols)) {
      items.forEach((d, idx) => {
        order.push({ id: d.Id, category: catId === UNCATEGORIZED ? "" : catId, order: idx });
      });
    }
    sheetsPost("reorderDrills", { order }).catch(() => {});
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    setColumns((prev) => {
      const activeId = String(active.id);
      const overId = String(over.id);

      let fromCol: string | null = null;
      for (const [key, items] of Object.entries(prev)) {
        if (items.some((d) => d.Id === activeId)) {
          fromCol = key;
          break;
        }
      }
      if (!fromCol) return prev;

      let toCol: string | null = null;
      let toIndex = -1;
      if (overId.startsWith("col:")) {
        toCol = overId.slice(4);
        toIndex = prev[toCol]?.length ?? 0;
      } else {
        for (const [key, items] of Object.entries(prev)) {
          const idx = items.findIndex((d) => d.Id === overId);
          if (idx !== -1) {
            toCol = key;
            toIndex = idx;
            break;
          }
        }
      }
      if (!toCol) return prev;

      const fromItems = [...prev[fromCol]];
      const fromIndex = fromItems.findIndex((d) => d.Id === activeId);
      const [moved] = fromItems.splice(fromIndex, 1);

      const toItems = fromCol === toCol ? fromItems : [...prev[toCol]];
      let insertAt = toIndex;
      if (fromCol === toCol && fromIndex < toIndex) insertAt -= 1;
      if (insertAt < 0) insertAt = 0;
      toItems.splice(insertAt, 0, moved);

      const next = { ...prev, [fromCol]: fromItems };
      next[toCol] = toItems;

      persistOrder(next);
      return next;
    });
  }

  async function handleDeleteDrill(drill: RawDrillRow) {
    if (!confirm(`Delete "${drill.Name}"?`)) return;
    await sheetsPost("deleteDrill", { id: drill.Id });
    refresh();
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await sheetsPost("addCategory", { name: newCategoryName.trim() });
    setNewCategoryName("");
    setAddingCategory(false);
    refresh();
  }

  async function handleRenameCategory(id: string, name: string) {
    await sheetsPost("updateCategory", { id, name });
    refresh();
  }

  async function handleDeleteCategory(category: RawDrillCategoryRow) {
    if (
      !confirm(
        `Delete category "${category.Name}"? Videos in it will move to Uncategorized.`
      )
    )
      return;
    await sheetsPost("deleteCategory", { id: category.Id });
    refresh();
  }

  async function handleMoveCategory(index: number, dir: -1 | 1) {
    const next = [...categories];
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setCategories(next);
    await sheetsPost("reorderCategories", { order: next.map((c) => c.Id) });
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

  const sections: { id: string; name: string; category?: RawDrillCategoryRow }[] = [
    ...categories.map((c) => ({ id: c.Id, name: c.Name, category: c })),
    { id: UNCATEGORIZED, name: "Uncategorized" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide">DRILLS</h2>
          <p className="text-white/50 text-sm mt-1">
            Watch how each drill is done before logging it on the Daily Work tab.
          </p>
        </div>
        <div className="flex items-end gap-2 shrink-0">
          <CoachUnlock unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
          {unlocked && !addingCategory && (
            <button
              onClick={() => setAddingCategory(true)}
              className="bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
            >
              + Add Category
            </button>
          )}
        </div>
      </div>

      {unlocked && addingCategory && (
        <div className="rounded-lg border border-accent/40 p-4 flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm flex-1">
            Category name
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Hitting"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            />
          </label>
          <button
            onClick={handleAddCategory}
            className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={() => {
              setAddingCategory(false);
              setNewCategoryName("");
            }}
            className="text-white/40 hover:text-white text-sm px-2 py-2"
          >
            Cancel
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {sections.map((section, index) => {
          const drills = columns[section.id] || [];
          if (section.id === UNCATEGORIZED && drills.length === 0 && !unlocked) return null;
          return (
            <CategorySection
              key={section.id}
              section={section}
              drills={drills}
              canEdit={unlocked}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              adding={addingTo === section.id}
              onMoveUp={section.category ? () => handleMoveCategory(index, -1) : undefined}
              onMoveDown={section.category ? () => handleMoveCategory(index, 1) : undefined}
              onRename={
                section.category ? (name) => handleRenameCategory(section.id, name) : undefined
              }
              onDelete={section.category ? () => handleDeleteCategory(section.category!) : undefined}
              onStartAdd={() => setAddingTo(section.id)}
              onCancelAdd={() => setAddingTo(null)}
              onSaveAdd={async (name, description, videoUrl) => {
                await sheetsPost("addDrill", {
                  name,
                  description,
                  videoUrl,
                  category: section.id === UNCATEGORIZED ? "" : section.id,
                });
                setAddingTo(null);
                refresh();
              }}
              onDeleteDrill={handleDeleteDrill}
              onSaveDrill={async (drill, name, description, videoUrl, category) => {
                await sheetsPost("updateDrill", {
                  id: drill.Id,
                  name,
                  description,
                  videoUrl,
                  category: category === UNCATEGORIZED ? "" : category,
                });
                refresh();
              }}
              categories={categories}
            />
          );
        })}
      </DndContext>
    </div>
  );
}

function CategorySection({
  section,
  drills,
  canEdit,
  isFirst,
  isLast,
  adding,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
  onStartAdd,
  onCancelAdd,
  onSaveAdd,
  onDeleteDrill,
  onSaveDrill,
  categories,
}: {
  section: { id: string; name: string; category?: RawDrillCategoryRow };
  drills: RawDrillRow[];
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  adding: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSaveAdd: (name: string, description: string, videoUrl: string) => void;
  onDeleteDrill: (drill: RawDrillRow) => void;
  onSaveDrill: (
    drill: RawDrillRow,
    name: string,
    description: string,
    videoUrl: string,
    category: string
  ) => void;
  categories: RawDrillCategoryRow[];
}) {
  const { setNodeRef } = useDroppable({ id: `col:${section.id}` });
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-bold"
            />
            <button
              onClick={() => {
                if (renameValue.trim()) onRename?.(renameValue.trim());
                setRenaming(false);
              }}
              className="text-accent text-xs font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => {
                setRenameValue(section.name);
                setRenaming(false);
              }}
              className="text-white/40 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h3 className="text-sm font-bold tracking-wide text-white/70 uppercase">
            {section.name}
          </h3>
        )}

        {canEdit && !renaming && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            {section.category && (
              <>
                <button
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="hover:text-accent disabled:opacity-20"
                  title="Move category up"
                >
                  ▲
                </button>
                <button
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="hover:text-accent disabled:opacity-20"
                  title="Move category down"
                >
                  ▼
                </button>
                <button onClick={() => setRenaming(true)} className="hover:text-accent" title="Rename">
                  ✎
                </button>
                <button onClick={onDelete} className="hover:text-accent" title="Delete category">
                  ✕
                </button>
              </>
            )}
            {!adding && (
              <button
                onClick={onStartAdd}
                className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold px-3 py-1.5 rounded"
              >
                + Add Drill
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && adding && (
        <DrillForm
          onCancel={onCancelAdd}
          onSave={(name, description, videoUrl) => onSaveAdd(name, description, videoUrl)}
        />
      )}

      {drills.length === 0 && !adding ? (
        <p className="text-white/30 text-sm">No drills here yet.</p>
      ) : (
        <SortableContext items={drills.map((d) => d.Id)} strategy={rectSortingStrategy}>
          <div ref={setNodeRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[1px]">
            {drills.map((drill) => (
              <DraggableDrillCard
                key={drill.Id}
                drill={drill}
                canEdit={canEdit}
                onDelete={() => onDeleteDrill(drill)}
                onSave={(name, description, videoUrl, category) =>
                  onSaveDrill(drill, name, description, videoUrl, category)
                }
                categories={categories}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function DraggableDrillCard({
  drill,
  canEdit,
  onSave,
  onDelete,
  categories,
}: {
  drill: RawDrillRow;
  canEdit: boolean;
  onSave: (name: string, description: string, videoUrl: string, category: string) => void;
  onDelete: () => void;
  categories: RawDrillCategoryRow[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: drill.Id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DrillCard
        drill={drill}
        canEdit={canEdit}
        onSave={onSave}
        onDelete={onDelete}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
        categories={categories}
      />
    </div>
  );
}

function DrillCard({
  drill,
  canEdit,
  onSave,
  onDelete,
  dragHandleProps,
  categories,
}: {
  drill: RawDrillRow;
  canEdit: boolean;
  onSave: (name: string, description: string, videoUrl: string, category: string) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
  categories: RawDrillCategoryRow[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <DrillForm
        initialName={drill.Name}
        initialDescription={drill.Description}
        initialVideoUrl={drill.VideoUrl}
        initialCategory={drill.Category || UNCATEGORIZED}
        categories={categories}
        onCancel={() => setEditing(false)}
        onSave={(name, description, videoUrl, category) => {
          onSave(name, description, videoUrl, category);
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
            {dragHandleProps && (
              <button
                {...dragHandleProps}
                className="text-white/40 hover:text-accent text-xs px-1 cursor-grab active:cursor-grabbing"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                ⠿
              </button>
            )}
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
  initialCategory,
  categories,
  onSave,
  onCancel,
}: {
  initialName?: string;
  initialDescription?: string;
  initialVideoUrl?: string;
  initialCategory?: string;
  categories?: RawDrillCategoryRow[];
  onSave: (name: string, description: string, videoUrl: string, category: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [category, setCategory] = useState(initialCategory ?? UNCATEGORIZED);

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
      {categories && (
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          >
            <option value={UNCATEGORIZED}>Uncategorized</option>
            {categories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button
          onClick={() =>
            name.trim() &&
            videoUrl.trim() &&
            onSave(name.trim(), description.trim(), videoUrl.trim(), category)
          }
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
