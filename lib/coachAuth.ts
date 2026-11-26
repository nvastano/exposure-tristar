const TOKEN_KEY = "coachToken";
const UNLOCK_EVENT = "coachUnlockChanged";

const AUTH_URL = process.env.NEXT_PUBLIC_COACH_AUTH_URL ?? "";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiresAt = Number(token.split(".")[0]);
  if (!expiresAt || Date.now() >= expiresAt) {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function isCoachUnlocked(): boolean {
  return readToken() !== null;
}

// The signed token proving coach access, to be sent with any request for
// coach-only data (player/parent profiles, birth certificates). The Sheets
// Apps Script backend verifies it server-side — it is not just a client-side
// flag. Returns null if the coach hasn't unlocked or the token has expired.
export function getCoachToken(): string | null {
  return readToken();
}

export async function tryUnlockCoach(password: string): Promise<boolean> {
  if (!AUTH_URL) {
    console.warn("NEXT_PUBLIC_COACH_AUTH_URL is not set");
    return false;
  }
  try {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.ok && data.token) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      window.dispatchEvent(new Event(UNLOCK_EVENT));
      return true;
    }
  } catch (err) {
    console.error("Auth request failed:", err);
  }
  return false;
}

export function onCoachUnlockChanged(callback: () => void): () => void {
  window.addEventListener(UNLOCK_EVENT, callback);
  return () => window.removeEventListener(UNLOCK_EVENT, callback);
}
