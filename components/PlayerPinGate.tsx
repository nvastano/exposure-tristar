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

  useEffect(() => {
    setUnlocked(isPlayerUnlocked(playerId));
  }, [playerId]);

  // Not enforcing yet — render children directly
  if (!PLAYER_PINS_ENFORCED) return <>{children}</>;

  // No PIN set for this player — still open
  if (!storedPin) return <>{children}</>;

  if (unlocked) return <>{children}</>;

  function handleSubmit() {
    if (checkPlayerPin(pin, storedPin)) {
      unlockPlayer(playerId);
      setUnlocked(true);
      setError(false);
      setPin("");
    } else {
      setError(true);
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
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="PIN"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-full"
        />
        {error && <p className="text-red-400 text-sm text-center">Incorrect PIN.</p>}
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-white/90 transition-colors"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
