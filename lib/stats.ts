export type RawEntryRow = {
  Timestamp: string;
  Date: string;
  Player: string;
  Sprint1?: number | string;
  Sprint2?: number | string;
  Sprint3?: number | string;
  Throw1?: number | string;
  Throw2?: number | string;
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

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeSessions(rows: RawEntryRow[]): Session[] {
  return rows
    .map((row) => {
      const sprintTimes = [row.Sprint1, row.Sprint2, row.Sprint3]
        .map(toNum)
        .filter((n): n is number => n !== null);
      const throwVelos = [row.Throw1, row.Throw2]
        .map(toNum)
        .filter((n): n is number => n !== null);

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
