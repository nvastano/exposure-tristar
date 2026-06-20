import Link from "next/link";
import { sheetsGet } from "@/lib/sheets";
import { normalizeSessions, latestSession, sprintDelta, throwDelta } from "@/lib/stats";
import type { RawEntryRow } from "@/lib/stats";

export const dynamic = "force-dynamic";

type PlayerRow = { Name: string; Position?: string };

async function loadData() {
  try {
    const [players, entries] = await Promise.all([
      sheetsGet("players") as Promise<PlayerRow[]>,
      sheetsGet("entries") as Promise<RawEntryRow[]>,
    ]);
    return { players, entries, error: null as string | null };
  } catch (err) {
    return { players: [] as PlayerRow[], entries: [] as RawEntryRow[], error: (err as Error).message };
  }
}

export default async function Home() {
  const { players, entries, error } = await loadData();

  if (error) {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
        <p className="font-semibold mb-1">Sheet not connected yet</p>
        <p className="text-white/70">{error}</p>
        <p className="text-white/50 mt-2">
          Deploy the Apps Script Web App and set <code className="text-accent">SHEETS_WEBAPP_URL</code> in your
          environment.
        </p>
      </div>
    );
  }

  const byPlayer = new Map<string, ReturnType<typeof normalizeSessions>>();
  for (const p of players) byPlayer.set(p.Name, []);
  const allSessions = normalizeSessions(entries);
  for (const s of allSessions) {
    if (!byPlayer.has(s.player)) byPlayer.set(s.player, []);
    byPlayer.get(s.player)!.push(s);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">TEAM DASHBOARD</h1>
        <p className="text-white/50 text-sm mt-1">
          Home-to-first sprint times and 3rd-to-1st throw velocity, tracked week over week.
        </p>
      </div>

      {byPlayer.size === 0 && (
        <p className="text-white/50 text-sm">No players yet. Add data on the Coach Entry page.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(byPlayer.entries()).map(([name, sessions]) => {
          const latest = latestSession(sessions);
          const sDelta = sprintDelta(sessions);
          const tDelta = throwDelta(sessions);

          return (
            <Link
              key={name}
              href={`/players/${encodeURIComponent(name)}`}
              className="rounded-lg border border-white/10 p-5 hover:border-accent/60 transition-colors flex flex-col gap-3"
            >
              <span className="font-bold text-lg">{name}</span>

              <div className="flex justify-between text-sm">
                <span className="text-white/50">Best sprint (home–1st)</span>
                <span className="font-mono">
                  {latest?.bestSprint ? `${latest.bestSprint.toFixed(2)}s` : "—"}
                </span>
              </div>
              {sDelta !== null && (
                <DeltaBadge value={sDelta} betterWhenNegative label="vs last session" unit="s" />
              )}

              <div className="flex justify-between text-sm">
                <span className="text-white/50">Best throw (3rd–1st)</span>
                <span className="font-mono">
                  {latest?.bestThrow ? `${latest.bestThrow.toFixed(0)} mph` : "—"}
                </span>
              </div>
              {tDelta !== null && (
                <DeltaBadge value={tDelta} betterWhenNegative={false} label="vs last session" unit=" mph" />
              )}

              {sessions.length === 0 && <span className="text-white/30 text-xs">No sessions logged yet</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DeltaBadge({
  value,
  betterWhenNegative,
  label,
  unit,
}: {
  value: number;
  betterWhenNegative: boolean;
  label: string;
  unit: string;
}) {
  const improved = betterWhenNegative ? value < 0 : value > 0;
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/30">{label}</span>
      <span className={improved ? "text-green-400" : "text-accent"}>
        {sign}
        {value.toFixed(2)}
        {unit}
      </span>
    </div>
  );
}
