"use client";

const CALENDAR_ID = "2808a6446a55f37a122d29fc0ec8318a90c423e10306263af5c59f8be4c9b71c@group.calendar.google.com";

const MONTH_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
  CALENDAR_ID
)}&ctz=America%2FChicago&mode=MONTH&showTitle=0&showPrint=0&showCalendars=0&showTz=0&showNav=1&showDate=1`;

const SUBSCRIBE_URL = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
  CALENDAR_ID
)}`;

type Tournament = {
  date: string;       // "Sep 6–7"
  isoStart: string;   // for sorting / past detection "2026-09-06"
  name: string;
  location: string;
  format?: string;    // "Pool play + bracket"
  result?: string;    // "2–2" after the fact
  notes?: string;
};

// ── Update this list as tournaments are scheduled / completed ─────────────────
const TOURNAMENTS: Tournament[] = [
  {
    date: "Aug 29, 2026",
    isoStart: "2026-08-29",
    name: "One-Day Tournament",
    location: "TBD",
    format: "Pool play (1 day)",
    result: "2–2",
    notes: "Beat Smoke & LC Falcons. Lost twice to PV Eagles.",
  },
  // ── Add upcoming events below ─────────────────────────────────────────────
  // {
  //   date: "Sep 6–7, 2026",
  //   isoStart: "2026-09-06",
  //   name: "Fall Classic",
  //   location: "Columbus, OH",
  //   format: "Pool play + bracket",
  // },
];
// ─────────────────────────────────────────────────────────────────────────────

function statusChip(t: Tournament) {
  const today = new Date().toISOString().slice(0, 10);
  const past = t.isoStart < today;
  if (t.result) {
    const [w, l] = t.result.split("–").map(Number);
    const winning = w > l;
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${winning ? "bg-green-500/15 text-green-400" : "bg-accent/10 text-accent"}`}>
        {t.result}
      </span>
    );
  }
  if (past) return <span className="text-xs text-white/20 italic">No result</span>;
  return <span className="text-xs font-semibold text-accent/70 bg-accent/10 px-2 py-0.5 rounded">Upcoming</span>;
}

export default function SchedulePage() {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...TOURNAMENTS].sort((a, b) => a.isoStart.localeCompare(b.isoStart));
  const upcoming = sorted.filter((t) => t.isoStart >= today);
  const past = sorted.filter((t) => t.isoStart < today).reverse();

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Schedule</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Subscribe to get practice and game updates on your phone.
          </p>
        </div>
        <a
          href={SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/80 transition-colors shrink-0"
        >
          + Subscribe to Calendar
        </a>
      </div>

      {/* Main layout: calendar left, list right on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Month calendar */}
        <div className="rounded-lg border border-white/10 overflow-hidden bg-white/3">
          <iframe
            src={MONTH_URL}
            style={{ border: 0, display: "block" }}
            width="100%"
            height="560"
            frameBorder="0"
            scrolling="no"
          />
        </div>

        {/* Tournament list */}
        <div className="flex flex-col gap-5">

          {upcoming.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">Upcoming</h2>
              {upcoming.map((t, i) => (
                <TournamentCard key={i} t={t} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold tracking-widest text-white/30 uppercase">Past</h2>
              {past.map((t, i) => (
                <TournamentCard key={i} t={t} />
              ))}
            </div>
          )}

          {TOURNAMENTS.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-white/3 p-4 text-sm text-white/30">
              No tournaments scheduled yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TournamentCard({ t }: { t: Tournament }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm leading-tight">{t.name}</p>
          <p className="text-accent text-xs font-semibold mt-0.5">{t.date}</p>
        </div>
        <div className="shrink-0 mt-0.5">{statusChip(t)}</div>
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-white/40">
        <span>📍 {t.location}</span>
        {t.format && <span>🗂 {t.format}</span>}
        {t.notes && <p className="text-white/30 italic mt-1">{t.notes}</p>}
      </div>
    </div>
  );
}
