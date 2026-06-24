"use client";

import { useEffect, useState } from "react";
import { isCoachUnlocked, tryUnlockCoach } from "@/lib/coachAuth";
import Modal from "@/components/Modal";

export function useCoachUnlocked() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(isCoachUnlocked());
  }, []);

  return { unlocked, setUnlocked };
}

export default function CoachUnlock({
  unlocked,
  onUnlock,
}: {
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return null;

  function handleSubmit() {
    if (tryUnlockCoach(password)) {
      setOpen(false);
      setPassword("");
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/40 hover:text-accent text-xs px-2 py-2 shrink-0"
        title="Coach login"
      >
        🔒 Coach Login
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-wide">COACH LOGIN</h2>
          <p className="text-white/50 text-sm">
            Enter the coach password to add, edit, or delete stats.
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="bg-white/5 border border-white/10 rounded px-3 py-2"
          />
          {error && <p className="text-accent text-sm">Incorrect password.</p>}
          <button
            onClick={handleSubmit}
            className="self-start bg-accent hover:bg-accent/80 transition-colors text-white font-semibold text-sm px-4 py-2 rounded"
          >
            Unlock
          </button>
        </div>
      </Modal>
    </>
  );
}
