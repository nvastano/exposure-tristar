const STORAGE_KEY = "coachUnlocked";
const UNLOCK_EVENT = "coachUnlockChanged";

const AUTH_URL = process.env.NEXT_PUBLIC_COACH_AUTH_URL ?? "";

export function isCoachUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
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
    if (data.ok) {
      sessionStorage.setItem(STORAGE_KEY, "1");
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
