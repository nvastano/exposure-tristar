const STORAGE_KEY = "coachUnlocked";
const COACH_PASSWORD = "exposurecoach";

export function isCoachUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function tryUnlockCoach(password: string): boolean {
  if (password !== COACH_PASSWORD) return false;
  sessionStorage.setItem(STORAGE_KEY, "1");
  return true;
}
