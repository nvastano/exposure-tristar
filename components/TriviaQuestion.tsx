"use client";

import { useState } from "react";
import { sheetsPost } from "@/lib/sheets";
import { localDateStr } from "@/lib/stats";
import type { TriviaQuestion } from "@/lib/trivia";

const LABELS = ["A", "B", "C", "D"] as const;

export default function TriviaQuestionCard({
  question,
  player,
}: {
  question: TriviaQuestion;
  player: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handlePick(label: string) {
    if (selected) return;
    setSelected(label);
    const correct = label === question.answer;
    setSaving(true);
    try {
      await sheetsPost("recordTriviaResponse", {
        player,
        questionId: question.id,
        answer: label,
        correct,
        date: localDateStr(),
      });
    } catch {
      // non-fatal
    } finally {
      setSaving(false);
    }
  }

  const answered = selected !== null;
  const correct = selected === question.answer;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span className="text-accent text-xs font-bold tracking-wide shrink-0 mt-0.5">⚾ TRIVIA</span>
      </div>
      <p className="text-sm font-semibold leading-snug">{question.question}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const label = LABELS[i];
          const isSelected = selected === label;
          const isCorrect = label === question.answer;
          let cls =
            "flex items-center gap-3 rounded px-3 py-2 text-sm text-left transition-colors border ";
          if (!answered) {
            cls += "border-white/10 hover:border-accent/50 hover:bg-white/5 cursor-pointer";
          } else if (isCorrect) {
            cls += "border-green-500/60 bg-green-500/10 text-green-400";
          } else if (isSelected) {
            cls += "border-accent/60 bg-accent/10 text-accent";
          } else {
            cls += "border-white/5 text-white/30";
          }
          return (
            <button
              key={label}
              onClick={() => handlePick(label)}
              disabled={answered}
              className={cls}
            >
              <span className="font-bold w-5 shrink-0">{label}</span>
              <span>{opt}</span>
              {isSelected && !isCorrect && <span className="ml-auto shrink-0">✗</span>}
              {isCorrect && answered && <span className="ml-auto shrink-0">✓</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`text-xs rounded px-3 py-2 ${correct ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/60"}`}>
          {correct ? "Correct! " : `The answer was ${question.answer}. `}
          {question.explanation}
        </div>
      )}
      {saving && <p className="text-white/30 text-xs">Saving…</p>}
    </div>
  );
}
