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

      {/* Coaches */}
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase text-center">Coaching Staff</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { img: "/coaches/sean_grizzle.jpg", name: "Sean Grizzle", role: "Head Coach" },
            { img: "/coaches/brian_horvath.jpg", name: "Brian Horvath", role: "Assistant Coach" },
            { img: "/coaches/nick_vastano.jpg", name: "Nick Vastano", role: "Assistant Coach / Tech Dude" },
          ].map((coach) => (
            <div key={coach.name} className="flex flex-col items-center gap-2 text-center">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coach.img} alt={coach.name} className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">{coach.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{coach.role}</p>
              </div>
            </div>
          ))}
        </div>
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
