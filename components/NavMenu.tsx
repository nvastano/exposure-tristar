"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCoachUnlocked, onCoachUnlockChanged, tryUnlockCoach } from "@/lib/coachAuth";

const PLAYER_LINKS = [
  { href: "/", label: "DRILLS" },
  { href: "/daily-work", label: "DAILY WORK" },
  { href: "/players", label: "PLAYERS" },
  { href: "/schedule", label: "SCHEDULE" },
  { href: "/fundraiser", label: "🌻 FUNDRAISER" },
];

const COACH_LINKS = [
  { href: "/coaches?tab=roster", label: "Roster Profiles" },
  { href: "/coaches?tab=plan", label: "Practice Plan" },
  { href: "/coaches?tab=stats", label: "Practice Stats" },
  { href: "/coaches?tab=footage", label: "Coaching Footage" },
];

function CoachLoginModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function attempt() {
    if (tryUnlockCoach(pw)) { onUnlock(); onClose(); }
    else { setError(true); setPw(""); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-80 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-lg font-bold tracking-wide">Coach Login</h2>
          <p className="text-white/40 text-sm mt-0.5">Enter the coach password to access the Coaches section.</p>
        </div>
        <input
          autoFocus
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") attempt(); if (e.key === "Escape") onClose(); }}
          placeholder="Password"
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
        />
        {error && <p className="text-accent text-xs -mt-2">Incorrect password.</p>}
        <div className="flex gap-2">
          <button onClick={attempt} className="flex-1 bg-accent hover:bg-accent/80 transition-colors text-white font-semibold py-2 rounded text-sm">
            Unlock
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded border border-white/10 hover:border-white/30 text-white/50 text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUnlocked(isCoachUnlocked());
    return onCoachUnlockChanged(() => setUnlocked(isCoachUnlocked()));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCoachOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isCoachPage = pathname === "/coaches";

  return (
    <>
      {showLogin && (
        <CoachLoginModal onClose={() => setShowLogin(false)} onUnlock={() => setUnlocked(true)} />
      )}

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-semibold tracking-wide">
        {PLAYER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-accent transition-colors">
            {link.label}
          </Link>
        ))}
        {!unlocked && (
          <button
            onClick={() => setShowLogin(true)}
            className="text-white/30 hover:text-white/60 transition-colors text-xs font-semibold tracking-wide"
          >
            COACHES
          </button>
        )}
        {unlocked && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCoachOpen((v) => !v)}
              className={`hover:text-accent transition-colors flex items-center gap-1 ${isCoachPage ? "text-accent" : ""}`}
            >
              COACHES
              <span className={`text-xs transition-transform duration-150 ${coachOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {coachOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-black border border-white/10 rounded-lg shadow-xl z-50 flex flex-col py-1">
                {COACH_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setCoachOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold tracking-wide hover:bg-white/5 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden flex flex-col justify-center gap-1.5 w-9 h-9 shrink-0"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span className={`block h-0.5 w-6 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block h-0.5 w-6 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`block h-0.5 w-6 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {open && (
        <nav className="md:hidden absolute left-0 right-0 top-full bg-black border-b border-white/10 flex flex-col text-sm font-semibold tracking-wide z-50">
          {PLAYER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 border-t border-white/10 hover:bg-white/5 hover:text-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {!unlocked && (
            <button
              onClick={() => { setOpen(false); setShowLogin(true); }}
              className="px-4 py-3 border-t border-white/10 text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors text-left text-sm font-semibold tracking-wide"
            >
              COACHES (Login)
            </button>
          )}
          {unlocked && (
            <>
              <div className="px-4 py-2 border-t border-white/10 text-white/30 text-xs tracking-widest uppercase">
                Coaches
              </div>
              {COACH_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="px-6 py-3 border-t border-white/5 hover:bg-white/5 hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      )}
    </>
  );
}
