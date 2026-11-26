"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

// ── Types ────────────────────────────────────────────────────────────────────

type Game = {
  Id: string; Date: string; Opponent: string; HomeAway: string;
  TeamScore: string; OppScore: string; Notes: string;
};
type BattingRow = {
  Id: string; GameId: string; Player: string;
  AB: string; R: string; H: string; RBI: string; BB: string; SO: string;
  doubles: string; triples: string; HR: string; SB: string; HBP: string; SAC: string;
};
type PitchingRow = {
  Id: string; GameId: string; Player: string;
  IP: string; H: string; R: string; ER: string; BB: string; SO: string;
  HR: string; BF: string; PC: string; Strikes: string; W: string; L: string; SV: string;
};

type ParsedGame = {
  date: string; opponent: string; homeAway: string;
  teamScore: number; oppScore: number; notes: string;
  batting: ParsedBatter[]; pitching: ParsedPitcher[];
  gameId?: string;
};
type ParsedBatter = { player: string; ab: number; r: number; h: number; rbi: number; bb: number; so: number; doubles: number; triples: number; hr: number; sb: number; hbp: number; sac: number; };
type ParsedPitcher = { player: string; ip: number; h: number; r: number; er: number; bb: number; so: number; hr: number; bf: number; pc: number; strikes: number; w: number; l: number; sv: number; };

// ── PDF parser ───────────────────────────────────────────────────────────────

function parsePdfText(raw: string): ParsedGame | null {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  // Header line: "Smoke 12U 4 - 6 Team Elite 12U" or similar
  // Also look for inning lines: SMK1 / TMLT
  let opponent = ""; let homeAway = "H"; let teamScore = 0; let oppScore = 0; let date = "";

  // Find score header — pattern: "AWAY # - # HOME"
  for (const line of lines) {
    const m = line.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
    if (m) {
      const away = m[1].trim(); const awayScore = parseInt(m[2]);
      const home = m[4].trim(); const homeScore = parseInt(m[3]);
      const isHome = /team elite/i.test(home);
      const isAway = /team elite/i.test(away);
      if (isHome) {
        opponent = away; homeAway = "H"; teamScore = homeScore; oppScore = awayScore;
      } else if (isAway) {
        opponent = home; homeAway = "A"; teamScore = awayScore; oppScore = homeScore;
      } else {
        // Can't tell — first team listed is away by convention
        opponent = home; homeAway = "A"; teamScore = awayScore; oppScore = homeScore;
      }
      break;
    }
  }

  // Find date — look for Saturday/Sunday Month Day Year or Month/Day/Year
  for (const line of lines) {
    const m1 = line.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
    const m2 = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (m1) { date = new Date(m1[1]).toISOString().slice(0, 10); break; }
    if (m2) { date = new Date(m2[1]).toISOString().slice(0, 10); break; }
  }

  // Find batting section
  // Pattern after "BATTING" line: each batter line has name + 6+ numbers
  const batting: ParsedBatter[] = [];
  const pitching: ParsedPitcher[] = [];

  let section = ""; // "batting" | "pitching"
  let teamSection = ""; // "away" | "home" | ""
  let inTeamElite = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^BATTING$/i.test(line)) { section = "batting"; continue; }
    if (/^PITCHING$/i.test(line)) { section = "pitching"; continue; }
    if (!section) continue;

    // Detect Team Elite column header
    if (/team elite/i.test(line)) { inTeamElite = true; continue; }

    if (section === "batting") {
      // Row pattern: "Player Name #N (POS)   AB   R   H   RBI  BB  SO"
      // Numbers are the last 6 tokens; first part is name
      const m = line.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
      if (m) {
        const nums = [m[2],m[3],m[4],m[5],m[6],m[7]].map(Number);
        const playerRaw = m[1].replace(/#\d+/, "").replace(/\(.*?\)/, "").trim();
        const player = cleanPlayerName(playerRaw);
        // Check if this belongs to Team Elite (we process both sides, but only keep TE)
        if (isTeamElitePlayer(player, line) || inTeamElite) {
          batting.push({ player, ab: nums[0], r: nums[1], h: nums[2], rbi: nums[3], bb: nums[4], so: nums[5], doubles: 0, triples: 0, hr: 0, sb: 0, hbp: 0, sac: 0 });
        }
      }
      // "Totals" resets team section
      if (/^Totals/i.test(line)) inTeamElite = false;
    }

    if (section === "pitching") {
      // Row pattern: "Player   IP  H  R  ER  BB  SO  HR"
      const m = line.match(/^(.+?)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
      if (m) {
        const player = cleanPlayerName(m[1].replace(/#\d+/, "").replace(/\(.*?\)/, "").trim());
        if (isTeamElitePlayer(player, line) || inTeamElite) {
          pitching.push({ player, ip: parseFloat(m[2]), h: +m[3], r: +m[4], er: +m[5], bb: +m[6], so: +m[7], hr: +m[8], bf: 0, pc: 0, strikes: 0, w: 0, l: 0, sv: 0 });
        }
      }
      if (/^Totals/i.test(line)) inTeamElite = false;
    }
  }

  // Fallback: if inTeamElite detection failed, try known player names
  const knownPlayers = ["Vastano","Horvath","Grizzle","Walker","Coates","Slayton","English","Montoya","Loftis","Griffith","Whitesides","Ramirez","Delp","Murphy","Hardwick","Caffrey","Greyson","Hudson","Mason","Jackson","Tyler","Hugh","Brett","Grey","Coffy"];

  // Parse extra stats from notes lines
  // e.g. "2B: M Walker, H English"
  const notesText = lines.join(" ");
  const doubles2B = extractStat(notesText, "2B");
  const triples3B = extractStat(notesText, "3B");
  const hrsHR = extractStat(notesText, "HR");
  const sbsSB = extractStat(notesText, "SB");
  const hbpHBP = extractStat(notesText, "HBP");

  // Annotate batting with extra stats
  batting.forEach(b => {
    if (playerMatchesAny(b.player, doubles2B)) b.doubles++;
    if (playerMatchesAny(b.player, triples3B)) b.triples++;
    if (playerMatchesAny(b.player, hrsHR)) b.hr++;
    if (playerMatchesAny(b.player, sbsSB)) b.sb++;
    if (playerMatchesAny(b.player, hbpHBP)) b.hbp++;
  });

  if (!date) date = new Date().toISOString().slice(0, 10);
  if (!opponent) opponent = "Unknown";

  return { date, opponent, homeAway, teamScore, oppScore, notes: "", batting, pitching };
}

function cleanPlayerName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isTeamElitePlayer(_player: string, line: string): boolean {
  // Simple heuristic: if line contains last name of known TE players
  const te = ["Vastano","Horvath","Grizzle","Walker","Coates","Slayton","English","Montoya","Loftis","Griffith"];
  return te.some(n => line.includes(n));
}

function extractStat(text: string, stat: string): string[] {
  const m = text.match(new RegExp(stat + ":\\s*([^,2B3BHRSBHBP]+(?:,[^,2B3BHRSBHBP]+)*)", "i"));
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(Boolean);
}

function playerMatchesAny(player: string, names: string[]): boolean {
  const last = player.split(" ").pop()?.toLowerCase() || "";
  return names.some(n => n.toLowerCase().includes(last) && last.length > 2);
}

// ── PDF.js loader ─────────────────────────────────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = document.getElementById("pdfjs-script");
    if (!script) {
      const s = document.createElement("script");
      s.id = "pdfjs-script";
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => doExtract(file, resolve, reject);
      s.onerror = reject;
      document.head.appendChild(s);
    } else {
      doExtract(file, resolve, reject);
    }
  });
}

function doExtract(file: File, resolve: (s: string) => void, reject: (e: Error) => void) {
  const w = window as any;
  if (!w.pdfjsLib) { reject(new Error("PDF.js not loaded")); return; }
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const typedArray = new Uint8Array(e.target!.result as ArrayBuffer);
      const pdf = await w.pdfjsLib.getDocument(typedArray).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + "\n";
      }
      resolve(text);
    } catch (err: any) { reject(err); }
  };
  reader.readAsArrayBuffer(file);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: string | number) { return Number(v) || 0; }

function avg(h: number, ab: number) {
  if (!ab) return ".000";
  return "." + String(Math.round((h / ab) * 1000)).padStart(3, "0");
}

function era(er: number, ip: number) {
  if (!ip) return "—";
  return ((er / ip) * 7).toFixed(2);
}

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SeasonAnalysis() {
  const [games, setGames] = useState<Game[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"log" | "batting" | "pitching" | "game">("log");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [playerFilter, setPlayerFilter] = useState("");

  // PDF upload state
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedGame | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [g, b, p] = await Promise.all([
        sheetsGet("games") as Promise<Game[]>,
        sheetsGet("gameBatting") as Promise<BattingRow[]>,
        sheetsGet("gamePitching") as Promise<PitchingRow[]>,
      ]);
      setGames(g.sort((a, b) => a.Date > b.Date ? 1 : -1));
      setBatting(b);
      setPitching(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ── PDF handling ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) { setParseError("Please upload a PDF file."); return; }
    setParseError(""); setParsed(null); setSaveMsg("");
    setParsing(true);
    try {
      const text = await extractTextFromPdf(file);
      const result = parsePdfText(text);
      if (!result || (!result.batting.length && !result.pitching.length)) {
        setParseError("Couldn't parse batting/pitching from this PDF. Make sure it's the GC box score PDF (not the scorebook).");
      } else {
        setParsed(result);
      }
    } catch (e: any) {
      setParseError("Error reading PDF: " + e.message);
    } finally {
      setParsing(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function saveGame() {
    if (!parsed) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await sheetsPost("saveGame", parsed) as any;
      setSaveMsg(res.updated ? "Game updated!" : "Game saved!");
      setParsed(null);
      await loadData();
    } catch (e: any) {
      setSaveMsg("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame(gameId: string) {
    if (!confirm("Delete this game and all its stats?")) return;
    await sheetsPost("deleteGame", { gameId });
    setSelectedGame(null);
    await loadData();
  }

  // ── Season aggregates ─────────────────────────────────────────────────────

  const wins = games.filter(g => n(g.TeamScore) > n(g.OppScore)).length;
  const losses = games.filter(g => n(g.TeamScore) < n(g.OppScore)).length;
  const runsScored = games.reduce((s, g) => s + n(g.TeamScore), 0);
  const runsAllowed = games.reduce((s, g) => s + n(g.OppScore), 0);

  // Player season batting totals
  const players = Array.from(new Set(batting.map(r => r.Player))).sort();
  const seasonBatting = players.map(player => {
    const rows = batting.filter(r => r.Player === player);
    const ab = rows.reduce((s, r) => s + n(r.AB), 0);
    const h = rows.reduce((s, r) => s + n(r.H), 0);
    const r2 = rows.reduce((s, r) => s + n(r.R), 0);
    const rbi = rows.reduce((s, r) => s + n(r.RBI), 0);
    const bb = rows.reduce((s, r) => s + n(r.BB), 0);
    const so = rows.reduce((s, r) => s + n(r.SO), 0);
    const doubles = rows.reduce((s, r) => s + n(r.doubles), 0);
    const hr = rows.reduce((s, r) => s + n(r.HR), 0);
    const sb = rows.reduce((s, r) => s + n(r.SB), 0);
    return { player, ab, h, r: r2, rbi, bb, so, doubles, hr, sb, games: rows.length };
  }).sort((a, b) => {
    const aAvg = a.ab ? a.h / a.ab : 0;
    const bAvg = b.ab ? b.h / b.ab : 0;
    return bAvg - aAvg;
  });

  // Player season pitching totals
  const pitchers = Array.from(new Set(pitching.map(r => r.Player))).sort();
  const seasonPitching = pitchers.map(player => {
    const rows = pitching.filter(r => r.Player === player);
    const ip = rows.reduce((s, r) => s + n(r.IP), 0);
    const h = rows.reduce((s, r) => s + n(r.H), 0);
    const r2 = rows.reduce((s, r) => s + n(r.R), 0);
    const er = rows.reduce((s, r) => s + n(r.ER), 0);
    const bb = rows.reduce((s, r) => s + n(r.BB), 0);
    const so = rows.reduce((s, r) => s + n(r.SO), 0);
    const pc = rows.reduce((s, r) => s + n(r.PC), 0);
    const wins = rows.reduce((s, r) => s + n(r.W), 0);
    const losses = rows.reduce((s, r) => s + n(r.L), 0);
    return { player, ip, h, r: r2, er, bb, so, pc, wins, losses, apps: rows.length };
  }).sort((a, b) => b.ip - a.ip);

  if (loading) return <div className="text-white/40 text-sm py-8 text-center">Loading season data…</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center select-none ${
          dragging ? "border-accent bg-accent/10" : "border-white/15 hover:border-white/30 bg-white/3"
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {parsing ? (
          <p className="text-white/60 text-sm">Parsing PDF…</p>
        ) : (
          <>
            <p className="text-white font-semibold text-sm">Drop GC Box Score PDF here</p>
            <p className="text-white/40 text-xs mt-1">or click to browse — after each game, drop in the PDF and stats update automatically</p>
          </>
        )}
      </div>

      {parseError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{parseError}</div>
      )}

      {/* Parsed preview */}
      {parsed && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-white">
                {parsed.homeAway === "H" ? "vs" : "@"} {parsed.opponent}
                <span className="ml-3 text-accent">{parsed.teamScore} – {parsed.oppScore}</span>
                <span className={`ml-2 text-sm font-semibold ${parsed.teamScore > parsed.oppScore ? "text-green-400" : "text-red-400"}`}>
                  {parsed.teamScore > parsed.oppScore ? "W" : "L"}
                </span>
              </p>
              <p className="text-xs text-white/40 mt-0.5">{parsed.date} · {parsed.batting.length} batters · {parsed.pitching.length} pitchers parsed</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setParsed(null)} className="px-3 py-1.5 rounded border border-white/20 text-white/50 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={saveGame} disabled={saving} className="px-4 py-1.5 rounded bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Game"}
              </button>
            </div>
          </div>
          {/* Quick batting preview */}
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead><tr className="text-white/40 border-b border-white/10">
                {["Player","AB","R","H","RBI","BB","SO"].map(h => <th key={h} className="text-left pb-1 pr-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {parsed.batting.map((b, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1 pr-3 font-medium">{b.player}</td>
                    {[b.ab,b.r,b.h,b.rbi,b.bb,b.so].map((v,j) => <td key={j} className="py-1 pr-3 text-white/70">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {saveMsg && <p className={`text-sm font-semibold ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>{saveMsg}</p>}

      {/* Season summary */}
      {games.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Record", value: `${wins}–${losses}` },
              { label: "Games", value: games.length },
              { label: "Runs Scored", value: runsScored },
              { label: "Runs Allowed", value: runsAllowed },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/3 p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* View tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {(["log","batting","pitching"] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedGame(null); }}
                className={`flex-1 text-xs font-bold tracking-wide px-3 py-2 rounded-md transition-colors capitalize ${view === v && !selectedGame ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                {v === "log" ? "Game Log" : v === "batting" ? "Season Batting" : "Season Pitching"}
              </button>
            ))}
          </div>

          {/* Game log */}
          {view === "log" && !selectedGame && (
            <div className="flex flex-col gap-2">
              {games.map(g => {
                const w = n(g.TeamScore) > n(g.OppScore);
                const l = n(g.TeamScore) < n(g.OppScore);
                return (
                  <button key={g.Id} onClick={() => { setSelectedGame(g); setView("game"); }}
                    className="w-full rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 transition-colors px-4 py-3 flex items-center gap-4 text-left">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${w ? "bg-green-500/20 text-green-400" : l ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"}`}>
                      {w ? "W" : l ? "L" : "T"}
                    </span>
                    <span className="font-semibold text-sm flex-1">
                      {g.HomeAway === "H" ? "vs" : "@"} {g.Opponent}
                    </span>
                    <span className="text-sm font-bold text-white">{g.TeamScore}–{g.OppScore}</span>
                    <span className="text-xs text-white/40 w-16 text-right">{formatDate(g.Date)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Game detail */}
          {view === "game" && selectedGame && (
            <GameDetail
              game={selectedGame}
              batting={batting.filter(r => r.GameId === selectedGame.Id)}
              pitching={pitching.filter(r => r.GameId === selectedGame.Id)}
              onBack={() => { setSelectedGame(null); setView("log"); }}
              onDelete={() => deleteGame(selectedGame.Id)}
            />
          )}

          {/* Season batting */}
          {view === "batting" && !selectedGame && (
            <div className="flex flex-col gap-3">
              <input value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} placeholder="Filter player…"
                className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 w-48" />
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="text-sm w-full">
                  <thead><tr className="bg-white/5 text-white/40 text-xs">
                    {["Player","G","AB","R","H","AVG","2B","HR","RBI","BB","SO","SB"].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {seasonBatting.filter(r => !playerFilter || r.player.toLowerCase().includes(playerFilter.toLowerCase())).map((r, i) => (
                      <tr key={r.player} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.player}</td>
                        <td className="px-3 py-2 text-white/70">{r.games}</td>
                        <td className="px-3 py-2 text-white/70">{r.ab}</td>
                        <td className="px-3 py-2 text-white/70">{r.r}</td>
                        <td className="px-3 py-2 text-white/70">{r.h}</td>
                        <td className="px-3 py-2 font-bold text-accent">{avg(r.h, r.ab)}</td>
                        <td className="px-3 py-2 text-white/70">{r.doubles}</td>
                        <td className="px-3 py-2 text-white/70">{r.hr}</td>
                        <td className="px-3 py-2 text-white/70">{r.rbi}</td>
                        <td className="px-3 py-2 text-white/70">{r.bb}</td>
                        <td className="px-3 py-2 text-white/70">{r.so}</td>
                        <td className="px-3 py-2 text-white/70">{r.sb}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Season pitching */}
          {view === "pitching" && !selectedGame && (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="text-sm w-full">
                <thead><tr className="bg-white/5 text-white/40 text-xs">
                  {["Player","App","W","L","IP","ERA","H","R","ER","BB","SO","PC"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {seasonPitching.map((r, i) => (
                    <tr key={r.player} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.player}</td>
                      <td className="px-3 py-2 text-white/70">{r.apps}</td>
                      <td className="px-3 py-2 text-white/70">{r.wins}</td>
                      <td className="px-3 py-2 text-white/70">{r.losses}</td>
                      <td className="px-3 py-2 text-white/70">{r.ip.toFixed(1)}</td>
                      <td className="px-3 py-2 font-bold text-accent">{era(r.er, r.ip)}</td>
                      <td className="px-3 py-2 text-white/70">{r.h}</td>
                      <td className="px-3 py-2 text-white/70">{r.r}</td>
                      <td className="px-3 py-2 text-white/70">{r.er}</td>
                      <td className="px-3 py-2 text-white/70">{r.bb}</td>
                      <td className="px-3 py-2 text-white/70">{r.so}</td>
                      <td className="px-3 py-2 text-white/70">{r.pc || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {games.length === 0 && !parsed && !parsing && (
        <div className="text-center py-12 text-white/30 text-sm">
          No games yet. Drop a GC box score PDF above to add your first game.
        </div>
      )}
    </div>
  );
}

// ── Game detail view ──────────────────────────────────────────────────────────

function GameDetail({ game, batting, pitching, onBack, onDelete }: {
  game: Game; batting: BattingRow[]; pitching: PitchingRow[];
  onBack: () => void; onDelete: () => void;
}) {
  const w = n(game.TeamScore) > n(game.OppScore);
  const l = n(game.TeamScore) < n(game.OppScore);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white transition-colors">← Back</button>
        <div className="flex-1">
          <p className="font-bold text-white text-lg">
            {game.HomeAway === "H" ? "vs" : "@"} {game.Opponent}
            <span className="ml-3 text-accent">{game.TeamScore}–{game.OppScore}</span>
            <span className={`ml-2 text-sm font-semibold ${w ? "text-green-400" : l ? "text-red-400" : "text-white/40"}`}>{w ? "W" : l ? "L" : "T"}</span>
          </p>
          <p className="text-xs text-white/40">{formatDate(game.Date)}</p>
        </div>
        <button onClick={onDelete} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
      </div>

      {batting.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Batting</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="text-sm w-full">
              <thead><tr className="bg-white/5 text-white/40 text-xs">
                {["Player","AB","R","H","AVG","RBI","BB","SO","2B","HR","SB"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {batting.map((b, i) => (
                  <tr key={b.Id} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{b.Player}</td>
                    <td className="px-3 py-2 text-white/70">{b.AB}</td>
                    <td className="px-3 py-2 text-white/70">{b.R}</td>
                    <td className="px-3 py-2 text-white/70">{b.H}</td>
                    <td className="px-3 py-2 font-bold text-accent">{avg(n(b.H), n(b.AB))}</td>
                    <td className="px-3 py-2 text-white/70">{b.RBI}</td>
                    <td className="px-3 py-2 text-white/70">{b.BB}</td>
                    <td className="px-3 py-2 text-white/70">{b.SO}</td>
                    <td className="px-3 py-2 text-white/70">{b.doubles || 0}</td>
                    <td className="px-3 py-2 text-white/70">{b.HR || 0}</td>
                    <td className="px-3 py-2 text-white/70">{b.SB || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pitching.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Pitching</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="text-sm w-full">
              <thead><tr className="bg-white/5 text-white/40 text-xs">
                {["Player","IP","H","R","ER","ERA","BB","SO","PC"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pitching.map((p, i) => (
                  <tr key={p.Id} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{p.Player}</td>
                    <td className="px-3 py-2 text-white/70">{p.IP}</td>
                    <td className="px-3 py-2 text-white/70">{p.H}</td>
                    <td className="px-3 py-2 text-white/70">{p.R}</td>
                    <td className="px-3 py-2 text-white/70">{p.ER}</td>
                    <td className="px-3 py-2 font-bold text-accent">{era(n(p.ER), n(p.IP))}</td>
                    <td className="px-3 py-2 text-white/70">{p.BB}</td>
                    <td className="px-3 py-2 text-white/70">{p.SO}</td>
                    <td className="px-3 py-2 text-white/70">{p.PC || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
