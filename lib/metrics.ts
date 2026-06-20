export type MetricType = "number" | "boolean";

export type MetricDef = {
  key: string;
  label: string;
  unit?: string;
  type: MetricType;
};

// Add new trackable stats here as they come up — no backend changes needed,
// the Metrics sheet stores {player, date, metric: key, value} generically.
export const METRIC_DEFS: MetricDef[] = [
  { key: "buckets", label: "Buckets of balls hit", type: "number" },
  { key: "pushups", label: "Push-ups", type: "number" },
  { key: "situps", label: "Sit-ups", type: "number" },
  { key: "playedCatch", label: "Played catch today", type: "boolean" },
];

export function metricDef(key: string): MetricDef | undefined {
  return METRIC_DEFS.find((m) => m.key === key);
}

export type RawMetricRow = {
  Id: string;
  Timestamp: string;
  Date: string;
  Player: string;
  Metric: string;
  Value: string;
};
