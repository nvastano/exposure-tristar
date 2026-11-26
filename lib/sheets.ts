import { getCoachToken } from "@/lib/coachAuth";

const WEBAPP_URL = process.env.NEXT_PUBLIC_SHEETS_WEBAPP_URL;

function requireUrl(): string {
  if (!WEBAPP_URL) {
    throw new Error(
      "NEXT_PUBLIC_SHEETS_WEBAPP_URL is not set. Deploy the Apps Script Web App and add the URL to your environment."
    );
  }
  return WEBAPP_URL;
}

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

// Variants for actions the Apps Script backend requires a coach token for
// (player/parent profiles, birth certificates). The token is verified
// server-side in Code.gs, not just checked client-side.
function requireCoachToken(): string {
  const token = getCoachToken();
  if (!token) {
    throw new Error("Coach login required (or session expired) for this action.");
  }
  return token;
}

export async function sheetsGetAuthed(action: string, params: Record<string, string> = {}) {
  return sheetsGet(action, { ...params, token: requireCoachToken() });
}

export async function sheetsPostAuthed(action: string, payload: unknown) {
  return sheetsPost(action, { ...(payload as object), token: requireCoachToken() });
}
