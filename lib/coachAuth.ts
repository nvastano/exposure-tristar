const STORAGE_KEY = "coachUnlocked";
const COACH_PASSWORD = "exposurecoach";
const UNLOCK_EVENT = "coachUnlockChanged";

export function isCoachUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function tryUnlockCoach(password: string): boolean {
  if (password !== COACH_PASSWORD) return false;
  sessionStorage.setItem(STORAGE_KEY, "1");
  window.dispatchEvent(new Event(UNLOCK_EVENT));
  return true;
}

// Lets components outside the page that triggered the unlock (e.g. the
// nav, which doesn't remount on client-side navigation) react to it.
export function onCoachUnlockChanged(callback: () => void): () => void {
  window.addEventListener(UNLOCK_EVENT, callback);
  return () => window.removeEventListener(UNLOCK_EVENT, callback);
}
