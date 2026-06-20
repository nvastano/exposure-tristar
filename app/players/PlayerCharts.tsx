"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Session } from "@/lib/stats";

export default function PlayerCharts({ sessions }: { sessions: Session[] }) {
  const chartData = sessions.map((s) => ({
    date: s.date,
    bestSprint: s.bestSprint,
    bestThrow: s.bestThrow,
  }));

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="rounded-lg border border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white/70 mb-3">
          Home → 1st sprint (lower is better)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ffffff1a" />
            <XAxis dataKey="date" stroke="#ffffff66" fontSize={12} />
            <YAxis stroke="#ffffff66" fontSize={12} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid #333" }}
              labelStyle={{ color: "#fff" }}
            />
            <Line type="monotone" dataKey="bestSprint" stroke="#c8102e" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white/70 mb-3">
          3rd → 1st throw velocity (higher is better)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ffffff1a" />
            <XAxis dataKey="date" stroke="#ffffff66" fontSize={12} />
            <YAxis stroke="#ffffff66" fontSize={12} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid #333" }}
              labelStyle={{ color: "#fff" }}
            />
            <Line type="monotone" dataKey="bestThrow" stroke="#ffffff" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
