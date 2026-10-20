"use client";

import { useEffect, useState } from "react";
import { sheetsGet } from "@/lib/sheets";
import type { RawMetricRow } from "@/lib/metrics";
import DailyDigest from "@/components/DailyDigest";
import PlayerEntryForm from "@/components/PlayerEntryForm";
import Modal from "@/components/Modal";
import LogoLoader from "@/components/LogoLoader";

type PlayerRow = { Id: string; Name: string; Number?: string };
type TriviaResponseRow = { Player: string; QuestionId: string; Correct: string; Date: string };
type HwCompletionRow = { Player: string; WeekOf: string; CompletedAt: string };

export default function DailyPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [metrics, setMetrics] = useState<RawMetricRow[]>([]);
  const [triviaResponses, setTriviaResponses] = useState<TriviaResponseRow[]>([]);
  const [hwCompletions, setHwCompletions] = useState<HwCompletionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntry, setShowEntry] = useState(false);

  async function refresh() {
    try {
      const [playersData, metricsData, triviaData, hwData] = await Promise.all([
        sheetsGet("players") as Promise<PlayerRow[]>,
        sheetsGet("metrics") as Promise<RawMetricRow[]>,
        sheetsGet("triviaResponses").then((d) => (Array.isArray(d) ? d : [])).catch(() => []) as Promise<TriviaResponseRow[]>,
        (sheetsGet("homeworkCompletions") as Promise<HwCompletionRow[]>).catch(() => []),
      ]);
      setPlayers(playersData);
      setMetrics(metricsData);
      setTriviaResponses(triviaData);
      setHwCompletions(Array.isArray(hwData) ? hwData : []);
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
      <div className="flex justify-end">
        <button
          onClick={() => setShowEntry(true)}
          className="shrink-0 bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
        >
          + Player Entry
        </button>
      </div>

      <DailyDigest players={players} metrics={metrics} triviaResponses={triviaResponses} hwCompletions={hwCompletions} />

      <Modal open={showEntry} onClose={() => setShowEntry(false)}>
        <PlayerEntryForm
          onSaved={() => {
            refresh();
            setShowEntry(false);
          }}
        />
      </Modal>
    </div>
  );
}
