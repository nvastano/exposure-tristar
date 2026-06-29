"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isCoachUnlocked, onCoachUnlockChanged } from "@/lib/coachAuth";

const LINKS = [
  { href: "/", label: "DRILLS" },
  { href: "/daily-work", label: "DAILY WORK" },
  { href: "/practice", label: "PRACTICE STATS" },
  { href: "/footage", label: "COACHING" },
  { href: "/schedule", label: "SCHEDULE" },
];

const COACH_LINK = { href: "/practice-plan", label: "PRACTICE PLAN" };

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(isCoachUnlocked());
    return onCoachUnlockChanged(() => setUnlocked(isCoachUnlocked()));
  }, []);

  const links = unlocked ? [...LINKS, COACH_LINK] : LINKS;

  return (
    <>
      <nav className="hidden md:flex items-center gap-5 text-sm font-semibold tracking-wide">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-accent transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>

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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 border-t border-white/10 hover:bg-white/5 hover:text-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
