"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sheetsGet, sheetsPost } from "@/lib/sheets";

// ── Types ────────────────────────────────────────────────────────────────────

type Game = {
  Id: string; Date: string; Opponent: string; HomeAway: string;
  TeamScore: string; OppScore: string; Notes: string;
  Highlights?: string; Recap?: string; Season?: string;
};
type AtBat = {
  team: "our" | "opp"; player: string; jersey: number; inning: number;
  result: string; balls: number; strikes: number; fieldedTo: number;
};
type AtBatRecord = {
  Id: string; GameId: string; Team: string; Player: string; Jersey: string;
  Inning: string; Result: string; Balls: string; Strikes: string; FieldedTo: string;
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
  highlights?: string[]; recap?: string;
  gameId?: string; season?: string;
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

// ── Scorebook PDF parser ──────────────────────────────────────────────────────

function detectInningColumns(lines: string[]): number[] | null {
  for (const line of lines) {
    // Look for a line with digit headers 1-9 spaced ≥3 chars apart after col 15
    const m = line.match(/^.{15,}(\s+\d\s+){5,}/);
    if (!m) continue;
    const cols: number[] = [];
    // Find positions of standalone digits 1-9
    let re = /\b([1-9])\b/g;
    let match;
    while ((match = re.exec(line)) !== null) {
      const col = match.index;
      if (col >= 15) cols.push(col);
    }
    if (cols.length >= 6) return cols;
  }
  return null;
}

function colToInning(pos: number, cols: number[]): number {
  let best = 0; let bestDist = 9999;
  cols.forEach((c, i) => {
    const d = Math.abs(pos - c);
    if (d < bestDist) { bestDist = d; best = i + 1; }
  });
  return best;
}

function hitDirection(fieldedTo: number): "pull" | "center" | "oppo" {
  if ([5, 6, 7].includes(fieldedTo)) return "pull";   // left side for RHH
  if ([3, 4, 9].includes(fieldedTo)) return "oppo";   // right side for RHH
  return "center";
}

function parseScoreBookPdf(raw: string): AtBat[] {
  const lines = raw.split("\n");
  const atBats: AtBat[] = [];

  let inningCols: number[] | null = null;
  let currentTeam: "our" | "opp" = "opp";
  let playerName = "";
  let playerJersey = 0;

  // Track per-at-bat state: accumulate result, ball/strike lines by column
  // We collect batter blocks: starts with #jersey result line(s)
  type AbBlock = { inning: number; result: string; bLines: string[]; sLines: string[] };
  const pendingBlocks: AbBlock[] = [];

  function flushBlock(block: AbBlock) {
    // Count B and S from sequences like "B 1 2" or "S 3 4 5"
    let balls = 0; let strikes = 0; let fieldedTo = 0;

    for (const bl of block.bLines) {
      const nums = bl.trim().split(/\s+/);
      balls += nums.length;
    }
    for (const sl of block.sLines) {
      const nums = sl.trim().split(/\s+/);
      strikes += nums.length;
    }

    // Extract fielder position from result (e.g. "G3" → 3, "F7" → 7, "L4" → 4, "K" → 0)
    const fieldM = block.result.match(/[GFL](\d)/);
    if (fieldM) fieldedTo = parseInt(fieldM[1]);

    if (playerName && block.result) {
      atBats.push({
        team: currentTeam, player: playerName, jersey: playerJersey,
        inning: block.inning, result: block.result,
        balls, strikes, fieldedTo,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect team section headers
    if (/team elite/i.test(line) && /home|away/i.test(line)) {
      currentTeam = "our"; pendingBlocks.length = 0; playerName = ""; continue;
    }
    if (/smoke|opponent|away/i.test(line) && !currentTeam && i < 20) {
      currentTeam = "opp"; continue;
    }
    // Reset for second team section
    if (/team elite/i.test(line) && inningCols) {
      currentTeam = "our"; pendingBlocks.length = 0; playerName = "";
    }

    // Detect inning column header line
    if (!inningCols) {
      const cols = detectInningColumns([line]);
      if (cols) { inningCols = cols; continue; }
    }

    if (!inningCols) continue;

    // Player name line: "45   G. M        3B"  — jersey first, then initial + last
    const playerLineM = line.match(/^\s{0,4}(\d{1,2})\s{2,}([A-Z]\.\s+\S+)\s+\S{1,3}\s*$/);
    if (playerLineM) {
      playerJersey = parseInt(playerLineM[1]);
      playerName = playerLineM[2].replace(/\s+/g, " ").trim();
      continue;
    }

    // At-bat result line: "#45   G   [gap]   #32   L" — jersey+result at column positions
    const abLineM = line.match(/#\d{1,2}\s+[A-Z0-9]{1,4}/g);
    if (abLineM) {
      // For each match, find its column position and map to inning
      let re2 = /#(\d{1,2})\s+([A-Z0-9]{1,4})/g;
      let m2;
      while ((m2 = re2.exec(line)) !== null) {
        const col = m2.index;
        const inning = colToInning(col, inningCols);
        pendingBlocks.push({ inning, result: m2[2], bLines: [], sLines: [] });
      }
      continue;
    }

    // Ball sequence: "B 1 2 3" at a column position
    const bLineM = line.match(/^(\s*)B(\s+\d+)+\s*$/);
    if (bLineM && pendingBlocks.length > 0) {
      const col = bLineM[1].length;
      const inning = colToInning(col, inningCols);
      const block = pendingBlocks.find(b => b.inning === inning);
      if (block) {
        const nums = line.trim().replace(/^B\s*/, "").trim();
        block.bLines.push(nums);
      }
      continue;
    }

    // Strike sequence: "S 4 5" at a column position
    const sLineM = line.match(/^(\s*)S(\s+\d+)+\s*$/);
    if (sLineM && pendingBlocks.length > 0) {
      const col = sLineM[1].length;
      const inning = colToInning(col, inningCols);
      const block = pendingBlocks.find(b => b.inning === inning);
      if (block) {
        const nums = line.trim().replace(/^S\s*/, "").trim();
        block.sLines.push(nums);
      }
      continue;
    }

    // Blank line or new player = flush pending blocks
    if (!line.trim() && pendingBlocks.length > 0) {
      pendingBlocks.forEach(flushBlock);
      pendingBlocks.length = 0;
    }
  }

  // Flush any remaining
  pendingBlocks.forEach(flushBlock);

  return atBats;
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
  const dt = new Date(d.includes("T") ? d : d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ────────────────────────────────────────────────────────────

const ACTIVE_SEASON = "Fall 2026";

export default function SeasonAnalysis() {
  const [games, setGames] = useState<Game[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [dbAtBats, setDbAtBats] = useState<AtBatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"log" | "batting" | "pitching" | "trends" | "game">("log");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [playerFilter, setPlayerFilter] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(ACTIVE_SEASON);
  const [battingSort, setBattingSort] = useState<{ col: string; asc: boolean }>({ col: "AVG", asc: false });
  const [pitchingSort, setPitchingSort] = useState<{ col: string; asc: boolean }>({ col: "IP", asc: false });

  // PDF upload state
  const [dragging, setDragging] = useState(false);
  const [draggingScorebook, setDraggingScorebook] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedGame | null>(null);
  const [parsedAtBats, setParsedAtBats] = useState<AtBat[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [parseError, setParseError] = useState("");
  const [highlights, setHighlights] = useState<string[]>([""]);
  const [recap, setRecap] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scorebookRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [g, b, p, ga] = await Promise.all([
        sheetsGet("games") as Promise<Game[]>,
        sheetsGet("gameBatting") as Promise<BattingRow[]>,
        sheetsGet("gamePitching") as Promise<PitchingRow[]>,
        sheetsGet("gameAtBats") as Promise<AtBatRecord[]>,
      ]);
      setGames(g.sort((a, b) => a.Date > b.Date ? 1 : -1));
      setBatting(b);
      setPitching(p);
      setDbAtBats(ga);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ── PDF handling ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) { setParseError("Please upload a PDF file."); return; }
    setParseError(""); setParsed(null); setSaveMsg(""); setHighlights([""]); setRecap("");
    setParsing(true);
    try {
      const text = await extractTextFromPdf(file);
      const result = parsePdfText(text);
      if (!result || (!result.batting.length && !result.pitching.length)) {
        setParseError("Couldn't parse batting/pitching from this PDF. Make sure it's the GC box score PDF (not the scorebook).");
      } else {
        setParsed(result);
        setParsedAtBats([]);
      }
    } catch (e: any) {
      setParseError("Error reading PDF: " + e.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleScorebookFile(file: File) {
    if (!file.name.endsWith(".pdf")) return;
    setParsing(true);
    try {
      const text = await extractTextFromPdf(file);
      const atBats = parseScoreBookPdf(text);
      setParsedAtBats(atBats);
    } catch (e: any) {
      setParseError("Error reading scorebook: " + e.message);
    } finally {
      setParsing(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDropScorebook = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDraggingScorebook(false);
    const file = e.dataTransfer.files[0];
    if (file) handleScorebookFile(file);
  }, [parsed]);

  async function saveGame() {
    if (!parsed) return;
    setSaving(true); setSaveMsg("");
    try {
      const validHighlights = highlights.filter(h => h.trim());
      const payload = { ...parsed, highlights: validHighlights, recap, season: parsed.season || ACTIVE_SEASON };
      const res = await sheetsPost("saveGame", payload) as any;
      const gameId = res.gameId;
      if (parsedAtBats.length > 0 && gameId) {
        await sheetsPost("saveGameAtBats", { gameId, atBats: parsedAtBats });
      }
      setSaveMsg(res.updated ? "Game updated!" : "Game saved!");
      setParsed(null); setParsedAtBats([]); setHighlights([""]); setRecap("");
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

  // ── Season filter ─────────────────────────────────────────────────────────

  const seasons = Array.from(new Set(
    games.map(g => g.Season || "Fall 2026").filter(Boolean)
  )).sort().reverse();

  const filteredGames = games.filter(g => (g.Season || "Fall 2026") === selectedSeason);
  const filteredGameIds = new Set(filteredGames.map(g => g.Id));
  const filteredBatting = batting.filter(r => filteredGameIds.has(r.GameId));
  const filteredPitching = pitching.filter(r => filteredGameIds.has(r.GameId));
  const filteredAtBats = dbAtBats.filter(r => filteredGameIds.has(r.GameId));

  // ── Season aggregates ─────────────────────────────────────────────────────

  const wins = filteredGames.filter(g => n(g.TeamScore) > n(g.OppScore)).length;
  const losses = filteredGames.filter(g => n(g.TeamScore) < n(g.OppScore)).length;
  const runsScored = filteredGames.reduce((s, g) => s + n(g.TeamScore), 0);
  const runsAllowed = filteredGames.reduce((s, g) => s + n(g.OppScore), 0);

  // Player season batting totals
  const players = Array.from(new Set(filteredBatting.map(r => r.Player))).sort();
  const seasonBatting = players.map(player => {
    const rows = filteredBatting.filter(r => r.Player === player);
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
  const pitchers = Array.from(new Set(filteredPitching.map(r => r.Player))).sort();
  const seasonPitching = pitchers.map(player => {
    const rows = filteredPitching.filter(r => r.Player === player);
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
              <p className="text-xs text-white/40 mt-0.5">{parsed.date} · {parsed.batting.length} batters · {parsed.pitching.length} pitchers parsed{parsedAtBats.length > 0 ? ` · ${parsedAtBats.length} at-bats` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setParsed(null); setParsedAtBats([]); setHighlights([""]); setRecap(""); }} className="px-3 py-1.5 rounded border border-white/20 text-white/50 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={saveGame} disabled={saving} className="px-4 py-1.5 rounded bg-accent text-white text-sm font-bold hover:bg-accent/80 transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Game"}
              </button>
            </div>
          </div>

          {/* Highlights links */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Highlight Links</p>
            {highlights.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={link}
                  onChange={e => { const h = [...highlights]; h[idx] = e.target.value; setHighlights(h); }}
                  placeholder="Paste GC share link (e.g. https://gc.com/...)"
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
                />
                {highlights.length > 1 && (
                  <button onClick={() => setHighlights(highlights.filter((_, i) => i !== idx))} className="text-white/30 hover:text-white/70 text-lg leading-none">×</button>
                )}
              </div>
            ))}
            <button onClick={() => setHighlights([...highlights, ""])} className="text-xs text-accent/70 hover:text-accent text-left">+ Add another link</button>
          </div>

          {/* Recap */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Game Recap</p>
            <textarea
              value={recap}
              onChange={e => setRecap(e.target.value)}
              rows={3}
              placeholder="Paste GC-generated game recap text here…"
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 resize-none"
            />
          </div>

          {/* Scorebook PDF drop zone */}
          <div>
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Scorebook PDF <span className="text-white/20 font-normal normal-case">(optional — enables Trends analysis)</span></p>
            <div
              onDragOver={e => { e.preventDefault(); setDraggingScorebook(true); }}
              onDragLeave={() => setDraggingScorebook(false)}
              onDrop={onDropScorebook}
              onClick={() => scorebookRef.current?.click()}
              className={`border border-dashed rounded-lg p-3 cursor-pointer text-center text-xs transition-colors ${
                draggingScorebook ? "border-accent bg-accent/10 text-white" : parsedAtBats.length > 0 ? "border-green-500/40 bg-green-500/5 text-green-400" : "border-white/15 hover:border-white/30 text-white/30"
              }`}
            >
              <input ref={scorebookRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleScorebookFile(f); e.target.value = ""; }} />
              {parsedAtBats.length > 0 ? `✓ Scorebook parsed — ${parsedAtBats.length} at-bats` : parsing ? "Parsing…" : "Drop scorebook PDF here or click to browse"}
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
          {/* Season picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-semibold tracking-widest uppercase">Season</span>
            <div className="flex gap-1 flex-wrap">
              {seasons.map(s => (
                <button key={s} onClick={() => { setSelectedSeason(s); setSelectedGame(null); setView("log"); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedSeason === s ? "bg-accent text-white" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

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
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 flex-wrap">
            {(["log","batting","pitching","trends"] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedGame(null); }}
                className={`flex-1 text-xs font-bold tracking-wide px-3 py-2 rounded-md transition-colors capitalize min-w-fit ${view === v && !selectedGame ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                {v === "log" ? "Game Log" : v === "batting" ? "Season Batting" : v === "pitching" ? "Season Pitching" : "Trends"}
              </button>
            ))}
          </div>

          {/* Game log */}
          {view === "log" && !selectedGame && (
            <div className="flex flex-col gap-2">
              {filteredGames.map(g => {
                const w = n(g.TeamScore) > n(g.OppScore);
                const l = n(g.TeamScore) < n(g.OppScore);
                return (
                  <button key={g.Id} onClick={() => { setSelectedGame(g); setView("game"); }}
                    className="w-full rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 transition-colors px-4 py-3 flex items-center gap-4 text-left">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${w ? "bg-green-500/20 text-green-400" : l ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"}`}>
                      {w ? "W" : l ? "L" : "T"}
                    </span>
                    <span className="font-semibold text-sm flex-1">
                      {(g.HomeAway === "H" || g.HomeAway === "Home") ? "vs" : "@"} {g.Opponent}
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
          {view === "batting" && !selectedGame && (() => {
            const bCols: { key: string; label: string; val: (r: typeof seasonBatting[0]) => number }[] = [
              { key: "Player", label: "Player", val: () => 0 },
              { key: "G",      label: "G",      val: r => r.games },
              { key: "AB",     label: "AB",     val: r => r.ab },
              { key: "R",      label: "R",      val: r => r.r },
              { key: "H",      label: "H",      val: r => r.h },
              { key: "AVG",    label: "AVG",    val: r => r.ab ? r.h / r.ab : 0 },
              { key: "2B",     label: "2B",     val: r => r.doubles },
              { key: "HR",     label: "HR",     val: r => r.hr },
              { key: "RBI",    label: "RBI",    val: r => r.rbi },
              { key: "BB",     label: "BB",     val: r => r.bb },
              { key: "SO",     label: "SO",     val: r => r.so },
              { key: "SB",     label: "SB",     val: r => r.sb },
            ];
            const toggleBSort = (col: string) => setBattingSort(s => ({ col, asc: s.col === col ? !s.asc : false }));
            const colDef = bCols.find(c => c.key === battingSort.col);
            const sorted = [...seasonBatting]
              .filter(r => !playerFilter || r.player.toLowerCase().includes(playerFilter.toLowerCase()))
              .sort((a, b) => {
                if (battingSort.col === "Player") return battingSort.asc ? a.player.localeCompare(b.player) : b.player.localeCompare(a.player);
                const av = colDef ? colDef.val(a) : 0;
                const bv = colDef ? colDef.val(b) : 0;
                return battingSort.asc ? av - bv : bv - av;
              });
            return (
              <div className="flex flex-col gap-3">
                <input value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} placeholder="Filter player…"
                  className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 w-48" />
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="text-sm w-full">
                    <thead><tr className="bg-white/5 text-white/40 text-xs">
                      {bCols.map(c => (
                        <th key={c.key} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                          <button onClick={() => toggleBSort(c.key)}
                            className={`flex items-center gap-1 hover:text-white transition-colors ${battingSort.col === c.key ? "text-white" : ""}`}>
                            {c.label}
                            {battingSort.col === c.key ? (battingSort.asc ? " ↑" : " ↓") : ""}
                          </button>
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {sorted.map((r, i) => (
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
            );
          })()}

          {/* Season pitching */}
          {view === "pitching" && !selectedGame && (() => {
            const pCols: { key: string; label: string; val: (r: typeof seasonPitching[0]) => number }[] = [
              { key: "Player", label: "Player", val: () => 0 },
              { key: "App",    label: "App",    val: r => r.apps },
              { key: "W",      label: "W",      val: r => r.wins },
              { key: "L",      label: "L",      val: r => r.losses },
              { key: "IP",     label: "IP",     val: r => r.ip },
              { key: "ERA",    label: "ERA",    val: r => r.ip ? (r.er / r.ip) * 7 : 999 },
              { key: "H",      label: "H",      val: r => r.h },
              { key: "R",      label: "R",      val: r => r.r },
              { key: "ER",     label: "ER",     val: r => r.er },
              { key: "BB",     label: "BB",     val: r => r.bb },
              { key: "SO",     label: "SO",     val: r => r.so },
              { key: "PC",     label: "PC",     val: r => r.pc },
            ];
            const togglePSort = (col: string) => setPitchingSort(s => ({ col, asc: s.col === col ? !s.asc : false }));
            const colDef = pCols.find(c => c.key === pitchingSort.col);
            const sorted = [...seasonPitching].sort((a, b) => {
              if (pitchingSort.col === "Player") return pitchingSort.asc ? a.player.localeCompare(b.player) : b.player.localeCompare(a.player);
              const av = colDef ? colDef.val(a) : 0;
              const bv = colDef ? colDef.val(b) : 0;
              return pitchingSort.asc ? av - bv : bv - av;
            });
            return (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="text-sm w-full">
                  <thead><tr className="bg-white/5 text-white/40 text-xs">
                    {pCols.map(c => (
                      <th key={c.key} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                        <button onClick={() => togglePSort(c.key)}
                          className={`flex items-center gap-1 hover:text-white transition-colors ${pitchingSort.col === c.key ? "text-white" : ""}`}>
                          {c.label}
                          {pitchingSort.col === c.key ? (pitchingSort.asc ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sorted.map((r, i) => (
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
            );
          })()}

          {/* Trends view */}
          {view === "trends" && !selectedGame && (
            <TrendsView atBats={filteredAtBats} games={filteredGames} />
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

// ── Trends view ───────────────────────────────────────────────────────────────

function TrendsView({ atBats, games }: { atBats: AtBatRecord[]; games: Game[] }) {
  const [team, setTeam] = useState<"our" | "opp">("our");
  const [playerFilter, setPlayerFilter] = useState("");
  const [oppFilter, setOppFilter] = useState("all");

  if (atBats.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/3 p-8 text-center text-white/30 text-sm">
        No at-bat data yet. Drop a GC scorebook PDF alongside a box score to enable trends.
      </div>
    );
  }

  // Build opponent list from games for the filter dropdown
  const opponents = Array.from(new Set(games.map(g => g.Opponent))).sort();

  // For opponent view, optionally restrict to a specific opponent's games
  const allowedGameIds = team === "opp" && oppFilter !== "all"
    ? new Set(games.filter(g => g.Opponent === oppFilter).map(g => g.Id))
    : null;

  const teamAbs = atBats.filter(ab => {
    if (ab.Team !== (team === "our" ? "our" : "opp")) return false;
    if (allowedGameIds && !allowedGameIds.has(ab.GameId)) return false;
    return true;
  });
  const players = Array.from(new Set(teamAbs.map(ab => ab.Player))).sort();
  const filtered = playerFilter
    ? teamAbs.filter(ab => ab.Player.toLowerCase().includes(playerFilter.toLowerCase()))
    : teamAbs;

  // Per-player count stats
  const playerStats = players
    .filter(p => !playerFilter || p.toLowerCase().includes(playerFilter.toLowerCase()))
    .map(player => {
      const abs = filtered.filter(ab => ab.Player === player);
      const total = abs.length;
      if (!total) return null;

      // Count-based breakdowns
      const ahead = abs.filter(ab => Number(ab.Balls) < Number(ab.Strikes));
      const behind = abs.filter(ab => Number(ab.Balls) > Number(ab.Strikes));
      const even = abs.filter(ab => Number(ab.Balls) === Number(ab.Strikes));

      // Result buckets
      const K = (arr: AtBatRecord[]) => arr.filter(ab => /K|SO/.test(ab.Result)).length;
      const BB = (arr: AtBatRecord[]) => arr.filter(ab => /BB|W/.test(ab.Result)).length;
      const H = (arr: AtBatRecord[]) => arr.filter(ab => /^(1B|2B|3B|HR|H)/.test(ab.Result)).length;
      const pct = (num: number, den: number) => den ? Math.round((num / den) * 100) + "%" : "—";

      // Hit direction
      const hitAbs = abs.filter(ab => /^(1B|2B|3B|HR|H|G|F|L)/.test(ab.Result) && Number(ab.FieldedTo) > 0);
      const pull = hitAbs.filter(ab => [5,6,7].includes(Number(ab.FieldedTo))).length;
      const center = hitAbs.filter(ab => [1,2,8].includes(Number(ab.FieldedTo))).length;
      const oppo = hitAbs.filter(ab => [3,4,9].includes(Number(ab.FieldedTo))).length;

      return { player, total, ahead, behind, even, kFn: K, hFn: H, pull, center, oppo, hitAbs: hitAbs.length };
    }).filter(Boolean) as NonNullable<{ player: string; total: number; ahead: AtBatRecord[]; behind: AtBatRecord[]; even: AtBatRecord[]; kFn: (a: AtBatRecord[]) => number; hFn: (a: AtBatRecord[]) => number; pull: number; center: number; oppo: number; hitAbs: number }[]>[number][];

  const pct = (num: number, den: number) => den ? Math.round((num / den) * 100) + "%" : "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["our","opp"] as const).map(t => (
            <button key={t} onClick={() => setTeam(t)}
              className={`text-xs font-bold px-4 py-1.5 rounded-md transition-colors ${team === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
              {t === "our" ? "Our Team" : "Opponent"}
            </button>
          ))}
        </div>
        {team === "opp" && opponents.length > 1 && (
          <select value={oppFilter} onChange={e => { setOppFilter(e.target.value); setPlayerFilter(""); }}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/60">
            <option value="all">All opponents</option>
            {opponents.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <input value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} placeholder="Filter player…"
          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/60 w-40" />
        <span className="text-xs text-white/30">{filtered.length} at-bats</span>
      </div>

      {/* Count performance table */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Performance by Count</p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="text-xs w-full">
            <thead><tr className="bg-white/5 text-white/40">
              <th className="text-left px-3 py-2 font-semibold">Player</th>
              <th className="px-3 py-2 font-semibold text-right">PA</th>
              <th className="px-3 py-2 font-semibold text-right">Ahead K%</th>
              <th className="px-3 py-2 font-semibold text-right">Ahead H%</th>
              <th className="px-3 py-2 font-semibold text-right">Behind K%</th>
              <th className="px-3 py-2 font-semibold text-right">Behind H%</th>
              <th className="px-3 py-2 font-semibold text-right">Even K%</th>
              <th className="px-3 py-2 font-semibold text-right">Even H%</th>
            </tr></thead>
            <tbody>
              {playerStats.map((r, i) => (
                <tr key={r.player} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.player}</td>
                  <td className="px-3 py-2 text-white/70 text-right">{r.total}</td>
                  <td className="px-3 py-2 text-right text-green-400/80">{pct(r.kFn(r.ahead), r.ahead.length)}</td>
                  <td className="px-3 py-2 text-right text-accent">{pct(r.hFn(r.ahead), r.ahead.length)}</td>
                  <td className="px-3 py-2 text-right text-red-400/80">{pct(r.kFn(r.behind), r.behind.length)}</td>
                  <td className="px-3 py-2 text-right text-accent">{pct(r.hFn(r.behind), r.behind.length)}</td>
                  <td className="px-3 py-2 text-right text-white/50">{pct(r.kFn(r.even), r.even.length)}</td>
                  <td className="px-3 py-2 text-right text-accent">{pct(r.hFn(r.even), r.even.length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hit direction table */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Hit Direction</p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="text-xs w-full">
            <thead><tr className="bg-white/5 text-white/40">
              <th className="text-left px-3 py-2 font-semibold">Player</th>
              <th className="px-3 py-2 font-semibold text-right">Hits</th>
              <th className="px-3 py-2 font-semibold text-right">Pull%</th>
              <th className="px-3 py-2 font-semibold text-right">Center%</th>
              <th className="px-3 py-2 font-semibold text-right">Oppo%</th>
            </tr></thead>
            <tbody>
              {playerStats.filter(r => r.hitAbs > 0).map((r, i) => (
                <tr key={r.player} className={`border-t border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.player}</td>
                  <td className="px-3 py-2 text-white/70 text-right">{r.hitAbs}</td>
                  <td className="px-3 py-2 text-right text-accent">{pct(r.pull, r.hitAbs)}</td>
                  <td className="px-3 py-2 text-right text-white/60">{pct(r.center, r.hitAbs)}</td>
                  <td className="px-3 py-2 text-right text-blue-400/80">{pct(r.oppo, r.hitAbs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-white/20 mt-2">Pull = positions 5–7 (left side), Center = 1,2,8, Oppo = 3,4,9 (right side)</p>
      </div>
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

  let highlights: string[] = [];
  try { highlights = game.Highlights ? JSON.parse(game.Highlights) : []; } catch {}
  highlights = highlights.filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white transition-colors">← Back</button>
        <div className="flex-1">
          <p className="font-bold text-white text-lg">
            {(game.HomeAway === "H" || game.HomeAway === "Home") ? "vs" : "@"} {game.Opponent}
            <span className="ml-3 text-accent">{game.TeamScore}–{game.OppScore}</span>
            <span className={`ml-2 text-sm font-semibold ${w ? "text-green-400" : l ? "text-red-400" : "text-white/40"}`}>{w ? "W" : l ? "L" : "T"}</span>
          </p>
          <p className="text-xs text-white/40">{formatDate(game.Date)}</p>
        </div>
        <button onClick={onDelete} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
      </div>

      {highlights.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Highlights</p>
          <div className="flex flex-col gap-2">
            {highlights.map((link, i) => (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 border border-accent/40 text-accent text-sm font-bold hover:bg-accent/30 transition-colors w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {highlights.length > 1 ? `Highlights ${i + 1}` : "Watch Highlights"}
              </a>
            ))}
          </div>
        </div>
      )}

      {game.Recap && (
        <div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Game Recap</p>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{game.Recap}</p>
        </div>
      )}

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
