"use client";

import { Suspense, useEffect, useState } from "react";
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

function RosterProfiles() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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
                  ["DOB", profile.DOB ? (() => { const [y,m,d] = profile.DOB.split("-"); return `${m}/${d}/${y}`; })() : "—"],
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
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 w-48"
        />
      </div>

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
