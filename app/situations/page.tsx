"use client";

import { useMemo, useState } from "react";
import { SITUATIONS } from "@/lib/situations";
import type { FieldPositions } from "@/lib/situations";
import DiamondView from "@/components/DiamondView";

const POSITIONS: (keyof FieldPositions)[] = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const POSITION_LABELS: Record<keyof FieldPositions, string> = {
  P: "Pitcher",
  C: "Catcher",
  "1B": "First Baseman",
  "2B": "Second Baseman",
  "3B": "Third Baseman",
  SS: "Shortstop",
  LF: "Left Fielder",
  CF: "Center Fielder",
  RF: "Right Fielder",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SituationsPage() {
  const [selectedId, setSelectedId] = useState(SITUATIONS[0].id);
  const [answers, setAnswers] = useState<Partial<FieldPositions>>({});
  const [submitted, setSubmitted] = useState(false);

  const situation = SITUATIONS.find((s) => s.id === selectedId)!;

  // Shuffled answer options — re-shuffle whenever the situation changes
  const shuffledOptions = useMemo(
    () => shuffle(POSITIONS.map((p) => situation.answers[p])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId]
  );

  function handleSelect(id: string) {
    setSelectedId(id);
    setAnswers({});
    setSubmitted(false);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleReset() {
    setAnswers({});
    setSubmitted(false);
  }

  function handlePick(pos: keyof FieldPositions, value: string) {
    setAnswers((prev) => ({ ...prev, [pos]: value }));
  }

  const allFilled = POSITIONS.every((p) => answers[p]);

  // Which answers have already been assigned to another position
  const usedAnswers = new Set(Object.values(answers).filter(Boolean));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-wide">BASEBALL SITUATIONS</h1>
        <p className="text-white/50 text-sm mt-1">
          Read the scenario, then match each player to their correct assignment.
          Submit to see how you did.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              selectedId === s.id
                ? "bg-accent text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-2">
        <span className="text-accent text-xs font-bold tracking-wide">⚾ SITUATION</span>
        <h2 className="text-base font-bold">{situation.title}</h2>
        <p className="text-white/70 text-sm leading-relaxed">{situation.description}</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/3 p-4">
        <DiamondView visual={situation.visual} />
      </div>

      <div className="flex flex-col gap-4">
        {POSITIONS.map((pos) => {
          const selected = answers[pos] ?? "";
          const correctAnswer = situation.answers[pos];
          const isCorrect = submitted && selected === correctAnswer;
          const isWrong = submitted && selected && selected !== correctAnswer;

          return (
            <div key={pos} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-white/50 uppercase">
                {pos} — {POSITION_LABELS[pos]}
              </label>
              <select
                value={selected}
                onChange={(e) => handlePick(pos, e.target.value)}
                disabled={submitted}
                className={`bg-white/5 border rounded px-3 py-2 text-sm disabled:opacity-70 transition-colors ${
                  isCorrect
                    ? "border-green-500/60 bg-green-500/10 text-green-400"
                    : isWrong
                    ? "border-red-500/40 bg-red-500/5 text-red-400"
                    : "border-white/10"
                }`}
              >
                <option value="">
                  Select assignment for {POSITION_LABELS[pos]}…
                </option>
                {shuffledOptions.map((opt) => {
                  // Allow the option if it's the current selection for this pos,
                  // or if it hasn't been picked by another position yet
                  const takenByOther = usedAnswers.has(opt) && opt !== selected;
                  return (
                    <option key={opt} value={opt} disabled={takenByOther}>
                      {opt}
                    </option>
                  );
                })}
              </select>
              {submitted && isWrong && (
                <div className="text-xs rounded px-3 py-2 bg-white/5 text-white/60 border border-white/10">
                  <span className="font-semibold">Correct: </span>
                  {correctAnswer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className="bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white font-semibold text-sm px-5 py-2 rounded"
          >
            Submit Answers
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-sm px-5 py-2 rounded"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
