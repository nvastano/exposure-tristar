"use client";

import { useEffect, useState } from "react";
import { sheetsGet } from "@/lib/sheets";
import type { RawMetricRow } from "@/lib/metrics";
import DailyDigest from "@/components/DailyDigest";
import PlayerEntryForm from "@/components/PlayerEntryForm";

type PlayerRow = { Id: string; Name: string; Number?: string };

export default function DailyPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [metrics, setMetrics] = useState<RawMetricRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const [playersData, metricsData] = await Promise.all([
        sheetsGet("players") as Promise<PlayerRow[]>,
        sheetsGet("metrics") as Promise<RawMetricRow[]>,
      ]);
      setPlayers(playersData);
      setMetrics(metricsData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

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
      <PlayerEntryForm onSaved={refresh} />
      <DailyDigest players={players} metrics={metrics} />
    </div>
  );
}
