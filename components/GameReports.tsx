"use client";

import { useState } from "react";

type FocusArea = {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
};

type PlayerNote = {
  name: string;
  number: string;
  positives: string[];
  improve: string[];
};

type GameResult = {
  opponent: string;
  time: string;
  result: "W" | "L";
  summary: string;
  notes: string[];
};

type TournamentReport = {
  id: string;
  date: string;
  title: string;
  record: string;
  games: GameResult[];
  focusAreas: FocusArea[];
  playerNotes: PlayerNote[];
  coachNotes: string;
};

const REPORTS: TournamentReport[] = [
  {
    id: "aug-29-2026",
    date: "August 29, 2026",
    title: "One-Day Tournament",
    record: "2–2",
    coachNotes: "Went 2–2 on the day. PV Eagles beat us twice — same team, same patterns. A lot to build on. The wins showed what we're capable of. The losses showed exactly what we need to fix.",
    games: [
      {
        opponent: "Smoke 12U",
        time: "10:00 AM",
        result: "W",
        summary: "Strong offensive showing, Horvath dealt on the mound.",
        notes: [
          "Walker went off — multiple extra-base hits including two doubles",
          "Griffith had 3 hits including a 2B, produced runs",
          "English hit a double and drew a walk",
          "Coates and Slayton got on base consistently",
          "Smoke limited to 2 innings of action — mercy situation",
        ],
      },
      {
        opponent: "PV Eagles 12U",
        time: "11:30 AM",
        result: "L",
        summary: "Errors piled up and gave PV Eagles free bases they turned into runs.",
        notes: [
          "4 errors on a single batter — unacceptable, killed the inning",
          "Horvath picked off base — mental base running mistake",
          "PV Eagles scored primarily on errors, not clean hits",
          "English had a triple — one of our best at-bats of the day",
          "Too many groundball outs with runners on (Walker G1, Coates G6)",
          "Grizzle went 3-for-3 — one bright spot offensively",
        ],
      },
      {
        opponent: "LC Falcons 12U",
        time: "4:00 PM",
        result: "W",
        summary: "Blowout. Vastano threw lights out, offense erupted through the lineup.",
        notes: [
          "Vastano struck out the side multiple times — dominant outing",
          "Big first inning: walked the lineup around with key hits mixed in",
          "Entire order contributed — 11 batters came up in inning 1",
          "Montoya had 2 hits in the big inning",
          "Falcons struggled with control — walked and wild-pitched themselves into trouble",
          "Note: 3 passed balls in one AB — Slayton receiving needs attention",
        ],
      },
      {
        opponent: "PV Eagles 12U",
        time: "6:45 PM",
        result: "L",
        summary: "Same team, same result. Strikeouts mounted and walks combined with errors killed us.",
        notes: [
          "Hofeling struck out 3 times — approached PV pitching aggressively but whiffed",
          "English K'd twice after a great first matchup vs PV — fatigue or approach?",
          "Loftis K'd — recurring pattern across the day",
          "PV starter C.G and closer L.W both effective — need to study their approach",
          "Pitchers walked too many batters — free bases + errors = crooked numbers",
          "Grizzle stayed locked in — another hit and stayed aggressive",
          "Only 3 innings played — run rule likely",
        ],
      },
    ],
    focusAreas: [
      {
        priority: "high",
        title: "Fielding — Eliminate Errors on Routine Plays",
        detail: "Both losses to PV Eagles were fueled by errors, not their hitting. In one at-bat we committed 4 errors. Ground balls and pop-ups that should be outs became baserunners and runs. Reps on routine plays: ground balls to SS and 3B, pop-ups calling off each other, first baseman scooping throws in the dirt. Make this the top priority in the next 2 practices.",
      },
      {
        priority: "high",
        title: "Plate Approach vs. Live Pitching — Reduce Strikeouts",
        detail: "Game 4 was a strikeout storm: Hofeling (3 Ks), English (2 Ks), Loftis (K), Grizzle (K), Montoya (K). That's 8 Ks in a 3-inning game. We need to work on a two-strike approach — shorten up, put the ball in play, compete. The PV pitchers weren't overpowering; our hitters were getting themselves out. 'Protect the plate with two strikes' needs to become muscle memory.",
      },
      {
        priority: "high",
        title: "Pitching Control — Stop Putting Runners On",
        detail: "In both losses, our pitchers were walking batters. A walk becomes a run when it's followed by an error. We need to emphasize first-pitch strikes and living in the zone early in counts. Pull back film: how many 3-ball counts were self-inflicted? Work on bullpen sessions focused on 0-0 and 1-0 counts — attack.",
      },
      {
        priority: "medium",
        title: "Catcher Receiving — Passed Balls",
        detail: "Game 3 showed 3 passed balls in a single at-bat. While we won that game, it signals a receiving issue. Runners advance on PBs, which puts pressure on the pitcher. Work receiving drills with both catchers — framing, blocking low pitches, and setting up down in the zone.",
      },
      {
        priority: "medium",
        title: "Base Running IQ — Avoid Mental Mistakes",
        detail: "Horvath was picked off in Game 2 — a mental mistake that ended an inning. Several 'DI' (did not advance) notations throughout the day suggest runners not reading the ball. Work on live base running situations in practice: jump reads, going on contact, knowing the score/situation.",
      },
      {
        priority: "low",
        title: "Mid-Lineup Consistency — Walker & Coates in Losses",
        detail: "Walker was a force in Game 1 (multiple XBH) but went 0-for-4 in Games 2 and 4 (G1, L6, F9, L6). Coates also faded late. Late-day fatigue is real in a 4-game tournament. Work on maintaining approach and mechanics as the day goes on — tunnel vision on each at-bat.",
      },
    ],
    playerNotes: [
      {
        name: "C. Grizzle",
        number: "44",
        positives: ["Most consistent bat of the day — hits in every game", "3-for-3 in Game 2 even in a loss", "Stayed aggressive all day"],
        improve: ["Struck out in Game 4 — work on two-strike approach"],
      },
      {
        name: "H. English",
        number: "19",
        positives: ["Triple in Game 2 was one of the best ABs of the day", "Double + walk vs Smoke", "Solid day overall offensively"],
        improve: ["2 Ks in Game 4 — approach changed late in the day", "Pitching in Game 4 — needs more work on command"],
      },
      {
        name: "M. Walker",
        number: "71",
        positives: ["Dominated Game 1 — multiple doubles, drove in runs", "One of our best hitters when locked in"],
        improve: ["0-for-4 across Games 2 and 4 — lineouts and flyballs, not making adjustments", "Work on staying short to the ball against harder throwers"],
      },
      {
        name: "H. Vastano",
        number: "3",
        positives: ["Pitched a dominant Game 3 — lots of strikeouts against Falcons", "Multiple hits throughout the day"],
        improve: ["Command in key spots — needs to challenge batters early in counts when pitching"],
      },
      {
        name: "G. Loftis",
        number: "9",
        positives: ["Drew walks when needed", "Contributed in the Game 3 big inning"],
        improve: ["2 Ks in Game 1, 1 K in Game 4 — recurring pattern", "Work on contact approach, especially early in games to settle in", "Pitching in Game 4 — walks and control issues"],
      },
      {
        name: "M. Hofeling",
        number: "13",
        positives: ["Drew a walk in Game 3 big inning — contributed"],
        improve: ["3 strikeouts in Game 4 — worst single-game AB result of the day", "Clearly struggled with PV pitching — need to watch film together and build a plan for next time"],
      },
      {
        name: "G. Horvath",
        number: "99",
        positives: ["Solid pitching outing in Game 1 vs Smoke — set the tone", "Multiple hits across the day"],
        improve: ["Picked off base in Game 2 — work on base running reads and situational awareness", "Errors in the field (E, E+E notation) — needs focused fielding reps"],
      },
      {
        name: "T. Slayton",
        number: "21",
        positives: ["Got on base via HBP and hits throughout", "Solid effort at the plate"],
        improve: ["3 passed balls in one at-bat in Game 3 while catching — receiving needs work", "Groundball outs in Games 3 and 4 — work on driving through the ball"],
      },
    ],
  },
];

const priorityColor = {
  high: "border-accent/50 bg-accent/5",
  medium: "border-yellow-500/40 bg-yellow-500/5",
  low: "border-white/10 bg-white/3",
};

const priorityLabel = {
  high: { text: "HIGH", cls: "text-accent bg-accent/10" },
  medium: { text: "MED", cls: "text-yellow-400 bg-yellow-400/10" },
  low: { text: "LOW", cls: "text-white/40 bg-white/5" },
};

export default function GameReports() {
  const [selectedId, setSelectedId] = useState(REPORTS[0].id);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const report = REPORTS.find((r) => r.id === selectedId) ?? REPORTS[0];

  return (
    <div className="flex flex-col gap-8">

      {/* Tournament selector */}
      {REPORTS.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                r.id === selectedId
                  ? "border-accent/60 bg-accent/10 text-white"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {r.date} · {r.title}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Game Report</p>
        <h1 className="text-2xl font-bold tracking-wide">{report.date} — {report.title}</h1>
        <p className="text-white/50 text-sm mt-1 max-w-xl">{report.coachNotes}</p>
      </div>

      {/* Game cards */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Results — {report.record}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.games.map((g, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 flex flex-col gap-3 ${
                g.result === "W"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-accent/20 bg-accent/3"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm tracking-wide">{g.opponent}</p>
                  <p className="text-white/30 text-xs">{g.time}</p>
                </div>
                <span
                  className={`text-2xl font-black font-mono ${
                    g.result === "W" ? "text-green-400" : "text-accent"
                  }`}
                >
                  {g.result}
                </span>
              </div>
              <p className="text-white/60 text-xs italic">{g.summary}</p>
              <ul className="flex flex-col gap-1">
                {g.notes.map((n, j) => (
                  <li key={j} className="text-xs text-white/50 flex gap-1.5">
                    <span className="text-white/20 shrink-0 mt-0.5">—</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Focus areas */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Focus Areas for Practice</h2>
        <div className="flex flex-col gap-3">
          {report.focusAreas.map((f, i) => (
            <div key={i} className={`rounded-lg border p-4 flex flex-col gap-2 ${priorityColor[f.priority]}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${priorityLabel[f.priority].cls}`}>
                  {priorityLabel[f.priority].text}
                </span>
                <p className="font-bold text-sm">{f.title}</p>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Player notes */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Player Breakdowns</h2>
        <div className="flex flex-col gap-2">
          {report.playerNotes.map((p) => {
            const isOpen = expandedPlayer === p.name;
            return (
              <div key={p.name} className="rounded-lg border border-white/10 bg-white/3 overflow-hidden">
                <button
                  onClick={() => setExpandedPlayer(isOpen ? null : p.name)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white/30 text-sm w-6 text-right">#{p.number}</span>
                    <span className="font-semibold text-sm">{p.name}</span>
                  </div>
                  <span className={`text-xs transition-transform duration-150 text-white/30 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-green-400/60 uppercase mb-2">Positives</p>
                      <ul className="flex flex-col gap-1.5">
                        {p.positives.map((pos, i) => (
                          <li key={i} className="text-xs text-white/60 flex gap-1.5">
                            <span className="text-green-400/50 shrink-0">✓</span>
                            {pos}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-accent/60 uppercase mb-2">Work On</p>
                      <ul className="flex flex-col gap-1.5">
                        {p.improve.map((imp, i) => (
                          <li key={i} className="text-xs text-white/60 flex gap-1.5">
                            <span className="text-accent/50 shrink-0">→</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
