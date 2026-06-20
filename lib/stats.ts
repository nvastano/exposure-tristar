export type RawEntryRow = {
  Timestamp: string;
  Date: string;
  Player: string;
  SprintTimes?: string;
  ThrowVelos?: string;
  Notes?: string;
};

export type Session = {
  date: string;
  player: string;
  sprintTimes: number[];
  throwVelos: number[];
  bestSprint: number | null;
  bestThrow: number | null;
  notes: string;
};

function parseNumberCsv(v: string | undefined): number[] {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function normalizeSessions(rows: RawEntryRow[]): Session[] {
  return rows
    .map((row) => {
      const sprintTimes = parseNumberCsv(row.SprintTimes);
      const throwVelos = parseNumberCsv(row.ThrowVelos);

      return {
        date: row.Date,
        player: row.Player,
        sprintTimes,
        throwVelos,
        bestSprint: sprintTimes.length ? Math.min(...sprintTimes) : null,
        bestThrow: throwVelos.length ? Math.max(...throwVelos) : null,
        notes: row.Notes || "",
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestSession(sessions: Session[]): Session | null {
  return sessions.length ? sessions[sessions.length - 1] : null;
}

export function previousSession(sessions: Session[]): Session | null {
  return sessions.length > 1 ? sessions[sessions.length - 2] : null;
}

export function sprintDelta(sessions: Session[]): number | null {
  const latest = latestSession(sessions);
  const prev = previousSession(sessions);
  if (!latest?.bestSprint || !prev?.bestSprint) return null;
  return latest.bestSprint - prev.bestSprint; // negative = improvement (faster)
}

export function throwDelta(sessions: Session[]): number | null {
  const latest = latestSession(sessions);
  const prev = previousSession(sessions);
  if (!latest?.bestThrow || !prev?.bestThrow) return null;
  return latest.bestThrow - prev.bestThrow; // positive = improvement (harder throw)
}
