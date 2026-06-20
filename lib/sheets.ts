const WEBAPP_URL = process.env.SHEETS_WEBAPP_URL;

function requireUrl(): string {
  if (!WEBAPP_URL) {
    throw new Error(
      "SHEETS_WEBAPP_URL is not set. Deploy the Apps Script Web App and add the URL to your environment."
    );
  }
  return WEBAPP_URL;
}

export type Player = {
  name: string;
  position?: string;
};

export type SessionEntry = {
  date: string;
  player: string;
  sprintTimes: number[];
  throwVelos: number[];
  notes?: string;
};

export async function sheetsGet(action: string, params: Record<string, string> = {}) {
  const url = new URL(requireUrl());
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheets GET ${action} failed: ${res.status}`);
  return res.json();
}

export async function sheetsPost(action: string, payload: unknown) {
  const res = await fetch(requireUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...(payload as object) }),
  });
  if (!res.ok) throw new Error(`Sheets POST ${action} failed: ${res.status}`);
  return res.json();
}
