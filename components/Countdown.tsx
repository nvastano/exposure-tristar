"use client";

import { useEffect, useState } from "react";

function getTimeLeft(end: Date) {
  const diff = Math.max(0, end.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, done: diff === 0 };
}

export default function Countdown({ endDate }: { endDate: Date }) {
  const [time, setTime] = useState(getTimeLeft(endDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(endDate)), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (time.done) return null;

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ];

  const urgent = time.days < 3;

  return (
    <div className={`rounded-lg border p-5 flex flex-col gap-3 ${urgent ? "border-accent/50 bg-accent/5" : "border-white/10 bg-white/3"}`}>
      <p className={`text-xs font-bold tracking-widest uppercase ${urgent ? "text-accent" : "text-white/40"}`}>
        {urgent ? "⚡ Time is running out!" : "⏳ Sale ends in"}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {units.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span
              className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums leading-none ${urgent ? "text-accent" : "text-white"}`}
            >
              {String(value).padStart(2, "0")}
            </span>
            <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
