"use client";

import { useEffect, useMemo, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";
import { formatDate, localDateStr } from "@/lib/stats";
import type {
  RawPracticePlanCategoryRow,
  RawPracticePlanDrillRow,
  RawPracticePlanItemRow,
  RawPracticePlanRow,
} from "@/lib/practicePlan";
import { DEFAULT_PRACTICE_MINUTES, UNCATEGORIZED } from "@/lib/practicePlan";

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((m) => ({
  value: m,
  label:
    m < 60
      ? `${m} min`
      : m % 60 === 0
      ? `${m / 60} hour${m / 60 > 1 ? "s" : ""}`
      : `${Math.floor(m / 60)} hour${Math.floor(m / 60) > 1 ? "s" : ""} ${m % 60} min`,
}));
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";
import LogoLoader from "@/components/LogoLoader";

export default function PracticePlanPage() {
  const [plans, setPlans] = useState<RawPracticePlanRow[]>([]);
  const [library, setLibrary] = useState<RawPracticePlanDrillRow[]>([]);
  const [categories, setCategories] = useState<RawPracticePlanCategoryRow[]>([]);
  const [items, setItems] = useState<RawPracticePlanItemRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDate, setNewDate] = useState(localDateStr());
  const [newDuration, setNewDuration] = useState(String(DEFAULT_PRACTICE_MINUTES));
  const { unlocked, setUnlocked } = useCoachUnlocked();

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) =>
        (b.Date || "").localeCompare(a.Date || "") || (b.CreatedAt || "").localeCompare(a.CreatedAt || "")
      ),
    [plans]
  );

  async function refresh() {
    setLoading(true);
    try {
      const [planData, libraryData, categoryData] = await Promise.all([
        sheetsGet("practicePlans") as Promise<RawPracticePlanRow[]>,
        sheetsGet("practicePlanDrills") as Promise<RawPracticePlanDrillRow[]>,
        sheetsGet("practicePlanCategories") as Promise<RawPracticePlanCategoryRow[]>,
      ]);
      setPlans(planData);
      setLibrary([...libraryData].sort((a, b) => a.Name.localeCompare(b.Name)));
      setCategories(
        [...categoryData].sort((a, b) => Number(a.Order ?? 0) - Number(b.Order ?? 0))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const sorted = [...plans].sort((a, b) => (b.Date || "").localeCompare(a.Date || ""));
    if (sorted.length === 0) {
      setSelectedPlanId(null);
    } else if (!selectedPlanId || !sorted.some((p) => p.Id === selectedPlanId)) {
      setSelectedPlanId(sorted[0].Id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  async function loadItems(planId: string) {
    setItemsLoading(true);
    try {
      const data = (await sheetsGet("practicePlanItems", { planId })) as RawPracticePlanItemRow[];
      setItems(
        [...data].sort((a, b) => Number(a.Order ?? 0) - Number(b.Order ?? 0))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedPlanId) loadItems(selectedPlanId);
    else setItems([]);
  }, [selectedPlanId]);

  async function handleCreatePlan() {
    if (!newDate) return;
    const durationMinutes = parseInt(newDuration, 10) || DEFAULT_PRACTICE_MINUTES;
    const res = (await sheetsPost("createPracticePlan", { date: newDate, durationMinutes })) as { id: string };
    setCreating(false);
    setNewDuration(String(DEFAULT_PRACTICE_MINUTES));
    await refresh();
    setSelectedPlanId(res.id);
  }

  async function handleUpdateDuration(id: string, durationMinutes: number) {
    await sheetsPost("updatePracticePlan", { id, durationMinutes });
    await refresh();
  }

  async function handleDeletePlan(plan: RawPracticePlanRow) {
    if (!confirm(`Delete the practice plan for ${formatDate(plan.Date)}?`)) return;
    await sheetsPost("deletePracticePlan", { id: plan.Id });
    setSelectedPlanId(null);
    refresh();
  }

  async function handleAddItem(name: string, minutes: number, categoryId: string, videoUrl: string) {
    if (!selectedPlanId) return;
    await sheetsPost("addPlanItem", { planId: selectedPlanId, name, minutes, categoryId, videoUrl });
    await refresh();
    loadItems(selectedPlanId);
  }

  async function handleDeleteItem(id: string) {
    await sheetsPost("deletePlanItem", { id });
    if (selectedPlanId) loadItems(selectedPlanId);
  }

  async function handleUpdateItemVideo(id: string, videoUrl: string) {
    await sheetsPost("updatePlanItem", { id, videoUrl });
    if (selectedPlanId) loadItems(selectedPlanId);
  }

  async function handleAddCategory(name: string) {
    await sheetsPost("addPracticePlanCategory", { name });
    await refresh();
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-bold tracking-wide">COACHES ONLY</h1>
        <p className="text-white/50 text-sm max-w-sm">
          Practice plan building is restricted to coaches. Log in to view and build practice plans.
        </p>
        <CoachUnlock unlocked={unlocked} onUnlock={() => setUnlocked(true)} />
      </div>
    );
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

  const selectedPlan = sortedPlans.find((p) => p.Id === selectedPlanId) || null;
  const planDuration = Number(selectedPlan?.DurationMinutes) || DEFAULT_PRACTICE_MINUTES;
  const usedMinutes = items.reduce((sum, i) => sum + (Number(i.Minutes) || 0), 0);
  const remainingMinutes = planDuration - usedMinutes;

  return (
    <div className="flex flex-col gap-8">
      <div className="print:hidden flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide">PRACTICE PLAN</h1>
          <p className="text-white/50 text-sm mt-1">
            Build out the plan for an upcoming practice. Each practice is 4 hours — add items and watch
            the time left.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded shrink-0"
          >
            + New Plan
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-accent/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            Practice date
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm w-44">
            Duration
            <select
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePlan}
              className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="text-white/40 hover:text-white text-sm px-2 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedPlans.length === 0 ? (
        <p className="text-white/30 text-sm">No practice plans yet.</p>
      ) : (
        <>
          <div className="print:hidden flex flex-wrap gap-2">
            {sortedPlans.map((plan) => (
              <button
                key={plan.Id}
                onClick={() => setSelectedPlanId(plan.Id)}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                  selectedPlanId === plan.Id
                    ? "bg-accent text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {formatDate(plan.Date)}
              </button>
            ))}
          </div>

          {selectedPlan && (
            <div className="flex flex-col gap-4">
              <div className="print:hidden flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-wide">{formatDate(selectedPlan.Date)}</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="text-white/40 hover:text-accent text-xs px-1"
                  >
                    Print / Save as PDF
                  </button>
                  <button
                    onClick={() => handleDeletePlan(selectedPlan)}
                    className="text-white/40 hover:text-accent text-xs px-1"
                  >
                    Delete plan
                  </button>
                </div>
              </div>

              <div className="print:hidden">
                <TimeBudget
                  used={usedMinutes}
                  remaining={remainingMinutes}
                  total={planDuration}
                  onChangeDuration={(mins) => handleUpdateDuration(selectedPlan.Id, mins)}
                />
              </div>

              {itemsLoading ? (
                <LogoLoader />
              ) : (
                <>
                  <div className="print:hidden">
                    <ItemList
                      items={items}
                      categories={categories}
                      onDelete={handleDeleteItem}
                      onUpdateVideo={handleUpdateItemVideo}
                    />
                  </div>
                  <PrintablePlan
                    plan={selectedPlan}
                    items={items}
                    categories={categories}
                    usedMinutes={usedMinutes}
                    totalMinutes={planDuration}
                  />
                </>
              )}

              <div className="print:hidden">
                <AddItemForm
                  library={library}
                  categories={categories}
                  onAdd={handleAddItem}
                  onAddCategory={handleAddCategory}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function groupItemsByCategory(
  items: RawPracticePlanItemRow[],
  categories: RawPracticePlanCategoryRow[]
) {
  const groups: { id: string; name: string; items: RawPracticePlanItemRow[] }[] = categories.map(
    (c) => ({ id: c.Id, name: c.Name, items: [] })
  );
  const uncategorized: { id: string; name: string; items: RawPracticePlanItemRow[] } = {
    id: "",
    name: UNCATEGORIZED,
    items: [],
  };
  items.forEach((item) => {
    const group = groups.find((g) => g.id === item.CategoryId);
    if (group) group.items.push(item);
    else uncategorized.items.push(item);
  });
  return [...groups.filter((g) => g.items.length > 0), ...(uncategorized.items.length ? [uncategorized] : [])];
}

function PrintablePlan({
  plan,
  items,
  categories,
  usedMinutes,
  totalMinutes,
}: {
  plan: RawPracticePlanRow;
  items: RawPracticePlanItemRow[];
  categories: RawPracticePlanCategoryRow[];
  usedMinutes: number;
  totalMinutes: number;
}) {
  const groups = groupItemsByCategory(items, categories);
  return (
    <div className="hidden print:block text-black">
      <h1 className="text-2xl font-bold">{formatDate(plan.Date)} Practice Plan</h1>
      <p className="text-sm mt-1">
        {Math.floor(usedMinutes / 60)}h {usedMinutes % 60}m planned of{" "}
        {totalMinutes} min available
      </p>
      {groups.map((group) => (
        <div key={group.id || "uncategorized"} className="mt-4">
          <h2 className="text-lg font-bold">{group.name}</h2>
          <ul className="mt-1 list-disc pl-6">
            {group.items.map((item) => (
              <li key={item.Id} className="mb-1">
                {item.Name} — {Number(item.Minutes)} min
                {item.VideoUrl && (
                  <span className="ml-2 text-xs">
                    (<a href={item.VideoUrl} className="underline">{item.VideoUrl}</a>)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TimeBudget({
  used,
  remaining,
  total,
  onChangeDuration,
}: {
  used: number;
  remaining: number;
  total: number;
  onChangeDuration: (mins: number) => void;
}) {
  const over = remaining < 0;
  const pct = Math.min(100, Math.max(0, (used / total) * 100));
  const totalLabel = DURATION_OPTIONS.find((o) => o.value === total)?.label ?? `${total} min`;

  return (
    <div className="rounded-lg border border-white/10 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="text-white/60 flex items-center gap-1.5 flex-wrap">
          {Math.floor(used / 60)}h {used % 60}m used of{" "}
          <select
            value={DURATION_OPTIONS.some((o) => o.value === total) ? total : ""}
            onChange={(e) => onChangeDuration(Number(e.target.value))}
            className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-sm"
          >
            {!DURATION_OPTIONS.some((o) => o.value === total) && (
              <option value="">{totalLabel}</option>
            )}
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </span>
        <span className={over ? "text-accent font-semibold" : "text-white/60"}>
          {over
            ? `${Math.floor(-remaining / 60)}h ${-remaining % 60}m over`
            : `${Math.floor(remaining / 60)}h ${remaining % 60}m left`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all ${over ? "bg-accent" : "bg-accent/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onDelete,
  onUpdateVideo,
}: {
  item: RawPracticePlanItemRow;
  onDelete: (id: string) => void;
  onUpdateVideo: (id: string, url: string) => void;
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(item.VideoUrl || "");

  function commitUrl() {
    onUpdateVideo(item.Id, urlDraft.trim());
    setEditingUrl(false);
  }

  return (
    <div className="rounded-lg border border-white/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-semibold text-sm">{item.Name}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/50 text-sm font-mono">{Number(item.Minutes)} min</span>
          <button
            onClick={() => { setUrlDraft(item.VideoUrl || ""); setEditingUrl((v) => !v); }}
            className={`text-xs px-1 transition-colors ${item.VideoUrl ? "text-accent hover:text-accent/70" : "text-white/40 hover:text-accent"}`}
            aria-label="Video link"
            title={item.VideoUrl ? "Edit video link" : "Add video link"}
          >
            ▶
          </button>
          <button
            onClick={() => onDelete(item.Id)}
            className="text-white/40 hover:text-accent text-xs px-1"
            aria-label="Delete item"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
      {editingUrl && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://youtube.com/..."
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") commitUrl(); if (e.key === "Escape") setEditingUrl(false); }}
            autoFocus
          />
          <button onClick={commitUrl} className="text-accent text-sm font-semibold px-2">Save</button>
          <button onClick={() => setEditingUrl(false)} className="text-white/40 text-sm px-1">Cancel</button>
        </div>
      )}
      {!editingUrl && item.VideoUrl && (
        <div className="px-4 pb-3">
          <a
            href={item.VideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline truncate block max-w-full"
          >
            {item.VideoUrl}
          </a>
        </div>
      )}
    </div>
  );
}

function ItemList({
  items,
  categories,
  onDelete,
  onUpdateVideo,
}: {
  items: RawPracticePlanItemRow[];
  categories: RawPracticePlanCategoryRow[];
  onDelete: (id: string) => void;
  onUpdateVideo: (id: string, url: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-white/30 text-sm">No items added yet.</p>;
  }

  const groups = groupItemsByCategory(items, categories);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id || "uncategorized"} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-white/40 uppercase">
            {group.name}
          </h3>
          {group.items.map((item) => (
            <ItemRow key={item.Id} item={item} onDelete={onDelete} onUpdateVideo={onUpdateVideo} />
          ))}
        </div>
      ))}
    </div>
  );
}

function AddItemForm({
  library,
  categories,
  onAdd,
  onAddCategory,
}: {
  library: RawPracticePlanDrillRow[];
  categories: RawPracticePlanCategoryRow[];
  onAdd: (name: string, minutes: number, categoryId: string, videoUrl: string) => void;
  onAddCategory: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  function handleSave() {
    const mins = parseInt(minutes, 10);
    if (!name.trim() || !Number.isFinite(mins) || mins <= 0) return;
    onAdd(name.trim(), mins, categoryId, videoUrl.trim());
    setVideoUrl("");
    setName("");
    setMinutes("");
  }

  function handleSaveCategory() {
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim());
    setNewCategoryName("");
    setAddingCategory(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm flex-1">
            Drill or activity
            <input
              list="practice-plan-drill-library"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Infield Throwing Progressions"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <datalist id="practice-plan-drill-library">
              {library.map((d) => (
                <option key={d.Id} value={d.Name} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm w-44">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
            >
              <option value="">{UNCATEGORIZED}</option>
              {categories.map((c) => (
                <option key={c.Id} value={c.Id}>
                  {c.Name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm w-32">
            Minutes
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="15"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </label>
          <button
            onClick={handleSave}
            className="bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Add
          </button>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Video link <span className="text-white/30 font-normal">(optional)</span>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          />
        </label>
      </div>

      {addingCategory ? (
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm flex-1 max-w-xs">
            New category name
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Hitting"
              className="bg-white/5 border border-white/10 rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCategory();
              }}
            />
          </label>
          <button
            onClick={handleSaveCategory}
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
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          className="self-start text-white/40 hover:text-accent text-xs px-1"
        >
          + New category
        </button>
      )}
    </div>
  );
}
