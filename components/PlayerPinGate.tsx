"use client";

import { useState, useEffect } from "react";
import { isPlayerUnlocked, unlockPlayer, checkPlayerPin, PLAYER_PINS_ENFORCED } from "@/lib/playerAuth";

type Props = {
  playerId: string;
  playerName: string;
  storedPin: string; // empty string means no PIN set yet
  children: React.ReactNode;
};

export default function PlayerPinGate({ playerId, playerName, storedPin, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnlocked(isPlayerUnlocked(playerId));
  }, [playerId]);

  // Not enforcing yet — render children directly
  if (!PLAYER_PINS_ENFORCED) return <>{children}</>;

  // No PIN set for this player — still open
  if (!String(storedPin ?? "").trim()) return <>{children}</>;

  if (unlocked) return <>{children}</>;

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    setError(false);
    // Brief delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 600));
    try {
      if (checkPlayerPin(pin, storedPin)) {
        unlockPlayer(playerId);
        setUnlocked(true);
        setPin("");
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-1">Player Access</p>
        <h2 className="text-2xl font-black">{playerName}</h2>
        <p className="text-sm text-white/40 mt-1">Enter your PIN to continue.</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="relative">
          <input
            autoFocus
            autoComplete="off"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="PIN"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-full pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs font-semibold"
          >
            {showPin ? "HIDE" : "SHOW"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 font-bold">Wrong PIN</p>
            <p className="text-white/50 text-xs mt-1">
              Text or call Coach Nick directly for help.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !pin}
          className="w-full py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Checking...
            </>
          ) : (
            "Unlock"
          )}
        </button>

        <p className="text-xs text-white/30 text-center">
          Need your PIN?{" "}
          <span className="text-white/50">Text or call Coach Nick.</span>
        </p>
      </div>
    </div>
  );
}
