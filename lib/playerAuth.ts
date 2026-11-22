const SESSION_PREFIX = "playerUnlocked_";

// Set to true to start enforcing PINs. Currently false — all players pass.
export const PLAYER_PINS_ENFORCED = false;

export function isPlayerUnlocked(playerId: string): boolean {
  if (typeof window === "undefined") return false;
  if (!PLAYER_PINS_ENFORCED) return true;
  return sessionStorage.getItem(SESSION_PREFIX + playerId) === "1";
}

export function unlockPlayer(playerId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_PREFIX + playerId, "1");
}

export function lockPlayer(playerId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_PREFIX + playerId);
}

export function checkPlayerPin(pin: string, storedPin: string): boolean {
  if (!pin || !storedPin) return false;
  return pin.trim() === storedPin.trim();
}
