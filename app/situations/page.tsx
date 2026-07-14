"use client";

import { useState } from "react";
import { SITUATIONS } from "@/lib/situations";
import type { FieldPositions } from "@/lib/situations";

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

export default function SituationsPage() {
  const [selectedId, setSelectedId] = useState(SITUATIONS[0].id);
  const [answers, setAnswers] = useState<Partial<FieldPositions>>({});
  const [submitted, setSubmitted] = useState(false);

  const situation = SITUATIONS.find((s) => s.id === selectedId)!;

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

  const allFilled = POSITIONS.every((p) => answers[p]?.trim());

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-wide">BASEBALL SITUATIONS</h1>
        <p className="text-white/50 text-sm mt-1">
          Read the scenario, then describe where each player on the field should be or what they should do.
          Submit to see the correct answers.
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

      <div className="flex flex-col gap-4">
        {POSITIONS.map((pos) => {
          const userAnswer = answers[pos] ?? "";
          const correctAnswer = situation.answers[pos];
          const isCorrect =
            submitted &&
            userAnswer.trim().toLowerCase().split(/\s+/).some((word) =>
              correctAnswer.toLowerCase().includes(word) && word.length > 3
            );

          return (
            <div key={pos} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-white/50 uppercase">
                {pos} — {POSITION_LABELS[pos]}
              </label>
              <input
                value={userAnswer}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [pos]: e.target.value }))
                }
                disabled={submitted}
                placeholder={`What should the ${POSITION_LABELS[pos]} do?`}
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-60"
              />
              {submitted && (
                <div
                  className={`text-xs rounded px-3 py-2 ${
                    isCorrect
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-white/5 text-white/60 border border-white/10"
                  }`}
                >
                  <span className="font-semibold">{isCorrect ? "✓ " : ""}Correct answer: </span>
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
