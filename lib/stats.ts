export type RawEntryRow = {
  Id?: string;
  Timestamp: string;
  Date: string;
  Player: string;
  SprintTimes?: string;
  ThrowVelos?: string;
  Notes?: string;
};

export function localDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Sheet "Date" cells can come back as a Date object (serialized to a full
// ISO timestamp) if Sheets auto-detected the type — trim to the date part.
export function formatDate(date: string): string {
  return date.slice(0, 10);
}

export type Session = {
  id: string;
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
        id: row.Id || "",
        date: formatDate(row.Date),
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

// A "session" row now only carries one stat type at a time (coach entries are
// logged one value at a time), so the overall best has to be the min/max
// across all rows rather than just the most recent row's value.
export function bestSprintEver(sessions: Session[]): number | null {
  const vals = sessions.map((s) => s.bestSprint).filter((n): n is number => n !== null);
  return vals.length ? Math.min(...vals) : null;
}

export function bestThrowEver(sessions: Session[]): number | null {
  const vals = sessions.map((s) => s.bestThrow).filter((n): n is number => n !== null);
  return vals.length ? Math.max(...vals) : null;
}

export function sprintDelta(sessions: Session[]): number | null {
  const withSprint = sessions.filter((s) => s.bestSprint !== null);
  const latest = withSprint[withSprint.length - 1];
  const prev = withSprint[withSprint.length - 2];
  if (!latest?.bestSprint || !prev?.bestSprint) return null;
  return latest.bestSprint - prev.bestSprint; // negative = improvement (faster)
}

export function throwDelta(sessions: Session[]): number | null {
  const withThrow = sessions.filter((s) => s.bestThrow !== null);
  const latest = withThrow[withThrow.length - 1];
  const prev = withThrow[withThrow.length - 2];
  if (!latest?.bestThrow || !prev?.bestThrow) return null;
  return latest.bestThrow - prev.bestThrow; // positive = improvement (harder throw)
}
