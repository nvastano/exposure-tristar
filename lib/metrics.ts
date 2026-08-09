export type MetricType = "number" | "boolean";

export type MetricCategory = "Strength" | "Hitting" | "Throwing/Defense";

export type MetricDef = {
  key: string;
  label: string;
  unit?: string;
  type: MetricType;
  category: MetricCategory;
};

// Add new trackable stats here as they come up — no backend changes needed,
// the Metrics sheet stores {player, date, metric: key, value} generically.
export const METRIC_CATEGORIES: MetricCategory[] = ["Strength", "Hitting", "Throwing/Defense"];

export const METRIC_DEFS: MetricDef[] = [
  { key: "pushups", label: "Push-ups", type: "number", category: "Strength" },
  { key: "situps", label: "Sit-Ups", type: "number", category: "Strength" },
  { key: "squats", label: "Squats", type: "number", category: "Strength" },
  { key: "teeWork", label: "Tee Work", type: "boolean", category: "Hitting" },
  { key: "liveBp", label: "Live BP", type: "boolean", category: "Hitting" },
  { key: "frontToss", label: "Front Toss", type: "boolean", category: "Hitting" },
  { key: "longToss", label: "Long Toss", type: "boolean", category: "Throwing/Defense" },
  { key: "pitching", label: "Pitching", type: "boolean", category: "Throwing/Defense" },
  { key: "fielding", label: "Fielding", type: "boolean", category: "Throwing/Defense" },
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
