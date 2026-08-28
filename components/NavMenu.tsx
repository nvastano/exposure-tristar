"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCoachUnlocked, onCoachUnlockChanged } from "@/lib/coachAuth";

const PLAYER_LINKS = [
  { href: "/", label: "DRILLS" },
  { href: "/daily-work", label: "DAILY WORK" },
  { href: "/players", label: "PLAYERS" },
  { href: "/fundraiser", label: "🌻 FUNDRAISER" },
];

const COACH_LINKS = [
  { href: "/coaches?tab=roster", label: "Roster Profiles" },
  { href: "/coaches?tab=plan", label: "Practice Plan" },
  { href: "/coaches?tab=stats", label: "Practice Stats" },
  { href: "/coaches?tab=footage", label: "Coaching Footage" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
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
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-semibold tracking-wide">
        {PLAYER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-accent transition-colors">
            {link.label}
          </Link>
        ))}
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
