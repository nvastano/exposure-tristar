import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-10">
      {/* Team photo */}
      <div className="w-full max-w-3xl rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/team-photo.jpg"
          alt="12U Team Elite 2026"
          className="w-full object-cover"
        />
      </div>

      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-1">12U Team Elite · 2026</p>
        <h1 className="text-3xl font-black tracking-wide">TEAM ELITE PRIME</h1>
        <p className="text-white/50 mt-2 text-sm max-w-md mx-auto">
          Player development tracker — daily work, drills, practice stats, and more.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {[
          { href: "/drills", label: "Drills" },
          { href: "/daily-work", label: "Daily Work" },
          { href: "/players", label: "Players" },
          { href: "/schedule", label: "Schedule" },
          { href: "/monthly-report", label: "Monthly Report" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-white/10 bg-white/3 px-4 py-3 text-center text-sm font-semibold tracking-wide hover:bg-white/8 hover:border-accent/40 hover:text-accent transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
