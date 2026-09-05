"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isCoachUnlocked, onCoachUnlockChanged } from "@/lib/coachAuth";
import CoachUnlock, { useCoachUnlocked } from "@/components/CoachUnlock";
import LogoLoader from "@/components/LogoLoader";
import { sheetsGet } from "@/lib/sheets";
import GameReports from "@/components/GameReports";

// Lazy-load the heavy existing pages so only the active tab pays the cost
const PracticePlan = dynamic(() => import("@/app/practice-plan/page"), { ssr: false, loading: () => <LogoLoader /> });
const PracticeStats = dynamic(() => import("@/app/practice/page"), { ssr: false, loading: () => <LogoLoader /> });
const Footage = dynamic(() => import("@/app/footage/page"), { ssr: false, loading: () => <LogoLoader /> });

const TABS = [
  { id: "roster", label: "Roster Profiles" },
  { id: "reports", label: "Game Reports" },
  { id: "plan", label: "Practice Plan" },
  { id: "stats", label: "Practice Stats" },
  { id: "footage", label: "Coaching Footage" },
] as const;

type TabId = typeof TABS[number]["id"];

type PlayerProfile = {
  Player: string; DOB: string; HeightFt: string; HeightIn: string; Weight: string;
  Throws: string; Bats: string; OverhandSpeed: string; Number: string;
  Parent1Name: string; Parent1Email: string; Parent1Phone: string;
  Parent2Name: string; Parent2Email: string; Parent2Phone: string;
  Address: string; City: string; State: string; Zip: string; CreatedAt: string;
};

type PlayerRow = { Id: string; Name: string; Number?: string };

function height(p: PlayerProfile) {
  if (!p.HeightFt) return "—";
  return `${p.HeightFt}'${p.HeightIn || "0"}"`;
}

const EXPORT_FIELDS = [
  { key: "Player",       label: "Player Name" },
  { key: "DOB",          label: "Date of Birth" },
  { key: "Height",       label: "Height" },
  { key: "Weight",       label: "Weight" },
  { key: "Throws",       label: "Throws" },
  { key: "Bats",         label: "Bats" },
  { key: "Parent1Name",  label: "Parent 1 Name" },
  { key: "Parent1Email", label: "Parent 1 Email" },
  { key: "Parent1Phone", label: "Parent 1 Phone" },
  { key: "Parent2Name",  label: "Parent 2 Name" },
  { key: "Parent2Email", label: "Parent 2 Email" },
  { key: "Parent2Phone", label: "Parent 2 Phone" },
  { key: "Address",      label: "Address" },
  { key: "City",         label: "City" },
  { key: "State",        label: "State" },
  { key: "Zip",          label: "Zip" },
] as const;

type ExportKey = typeof EXPORT_FIELDS[number]["key"];

function formatDobForExport(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  } catch { return raw; }
}

function buildCsv(profiles: PlayerProfile[], fields: ExportKey[]): string {
  const header = fields.map((f) => EXPORT_FIELDS.find((e) => e.key === f)!.label);
  const rows = profiles.map((p) =>
    fields.map((f) => {
      let val = "";
      if (f === "Player")  val = p.Player;
      else if (f === "DOB") val = formatDobForExport(p.DOB);
      else if (f === "Height") val = p.HeightFt ? `${p.HeightFt}'${p.HeightIn || "0"}"` : "";
      else if (f === "Weight") val = p.Weight ? `${p.Weight} lbs` : "";
      else val = (p as any)[f] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    })
  );
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function RosterProfiles() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<ExportKey>>(
    new Set(["Player", "DOB", "Height", "Weight", "Throws", "Bats", "Parent1Name", "Parent1Phone"])
  );

  useEffect(() => {
    Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      (sheetsGet("playerProfiles") as Promise<PlayerProfile[]>).catch(() => [] as PlayerProfile[]),
    ]).then(([p, pr]) => {
      setPlayers(p);
      setProfiles(pr);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LogoLoader />;

  const profileMap = new Map(profiles.map((p) => [p.Player.trim().toLowerCase(), p]));
  const filtered = players.filter((p) =>
    p.Name.toLowerCase().includes(search.toLowerCase())
  );
  const submitted = filtered.filter((p) => profileMap.has(p.Name.trim().toLowerCase()));
  const missing = filtered.filter((p) => !profileMap.has(p.Name.trim().toLowerCase()));

  const submittedProfiles = players
    .map((p) => profileMap.get(p.Name.trim().toLowerCase()))
    .filter(Boolean) as PlayerProfile[];

  function toggleField(key: ExportKey) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleExport() {
    const ordered = EXPORT_FIELDS.filter((f) => selectedFields.has(f.key)).map((f) => f.key);
    const csv = buildCsv(submittedProfiles, ordered);
    downloadCsv(csv, "tristar-roster.csv");
  }

  function PlayerCard({ p }: { p: PlayerRow }) {
    const profile = profileMap.get(p.Name.trim().toLowerCase());
    const isOpen = expanded === p.Name;
    if (!profile) {
      return (
        <div className="rounded-lg border border-white/10 bg-white/3 p-4 flex items-center justify-between gap-3">
          <span className="font-semibold text-sm">{p.Name}</span>
          <span className="text-xs text-white/30 italic">Not submitted</span>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-white/10 bg-white/3 overflow-hidden">
        <button
          onClick={() => setExpanded(isOpen ? null : p.Name)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <span className="font-semibold text-sm">{p.Name}</span>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>{profile.Parent1Name || "—"}</span>
            <span>{profile.Parent1Phone || "—"}</span>
            <span className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>
        {isOpen && (
          <div className="border-t border-white/10 p-4 flex flex-col gap-4">
            {/* Athlete */}
            <div>
              <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-2">Athlete</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                {[
                  ["DOB", profile.DOB ? (() => { try { const d = new Date(profile.DOB); return `${d.getUTCMonth()+1}/${d.getUTCDate()}/${d.getUTCFullYear()}`; } catch { return profile.DOB; } })() : "—"],
                  ["Height", height(profile)],
                  ["Weight", profile.Weight ? `${profile.Weight} lbs` : "—"],
                  ["Throws", profile.Throws || "—"],
                  ["Bats", profile.Bats || "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex flex-col">
                    <span className="text-white/30 text-xs">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Parents */}
            {[
              { name: profile.Parent1Name, email: profile.Parent1Email, phone: profile.Parent1Phone, label: "Parent / Guardian 1" },
              { name: profile.Parent2Name, email: profile.Parent2Email, phone: profile.Parent2Phone, label: "Parent / Guardian 2" },
            ].filter((p) => p.name).map((p) => (
              <div key={p.label}>
                <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-2">{p.label}</p>
                <div className="flex flex-col gap-0.5 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  {p.email && <a href={`mailto:${p.email}`} className="text-accent hover:underline text-xs">{p.email}</a>}
                  {p.phone && <a href={`tel:${p.phone}`} className="text-white/60 hover:text-white text-xs">{p.phone}</a>}
                </div>
              </div>
            ))}
            {/* Address */}
            {(profile.Address || profile.City) && (
              <div>
                <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-1">Address</p>
                <p className="text-sm text-white/70">
                  {[profile.Address, profile.City, profile.State, profile.Zip].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/40">
            {submitted.length} of {players.length} profiles submitted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 w-48"
          />
          <button
            onClick={() => setShowExport((v) => !v)}
            className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors ${showExport ? "border-accent/60 text-accent bg-accent/10" : "border-white/10 text-white/50 hover:text-white hover:border-white/30"}`}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Export panel */}
      {showExport && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Choose Fields to Export</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.key)))} className="text-xs text-white/40 hover:text-white underline">All</button>
              <button onClick={() => setSelectedFields(new Set())} className="text-xs text-white/40 hover:text-white underline">None</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EXPORT_FIELDS.map((f) => {
              const on = selectedFields.has(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => toggleField(f.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${on ? "border-accent/40 bg-accent/10 text-white" : "border-white/10 text-white/30 hover:text-white/60"}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center text-[10px] ${on ? "border-accent bg-accent text-white" : "border-white/20"}`}>
                    {on ? "✓" : ""}
                  </span>
                  {f.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleExport}
            disabled={selectedFields.size === 0 || submittedProfiles.length === 0}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/80 transition-colors disabled:opacity-40"
          >
            Download {submittedProfiles.length} profiles
          </button>
        </div>
      )}

      {submitted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">Submitted ({submitted.length})</h3>
          {submitted.map((p) => <PlayerCard key={p.Id} p={p} />)}
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-widest text-white/30 uppercase">Not submitted ({missing.length})</h3>
          {missing.map((p) => <PlayerCard key={p.Id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function CoachesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") || "roster") as TabId;
  const { unlocked, setUnlocked } = useCoachUnlocked();

  function setTab(id: TabId) {
    router.replace(`/coaches?tab=${id}`);
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center gap-6 py-20">
        <p className="text-white/40 text-sm">Coach access required to view this section.</p>
        <CoachUnlock unlocked={false} onUnlock={() => setUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-max text-xs font-bold tracking-wide px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
              tab === t.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "roster" && <RosterProfiles />}
      {tab === "reports" && <GameReports />}
      {tab === "plan" && <PracticePlan />}
      {tab === "stats" && <PracticeStats />}
      {tab === "footage" && <Footage />}
    </div>
  );
}

export default function CoachesPage() {
  return (
    <Suspense fallback={<LogoLoader />}>
      <CoachesInner />
    </Suspense>
  );
}
