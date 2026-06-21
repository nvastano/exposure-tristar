import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TriStar Baseball | Speed & Throwing Tracker",
  description: "TriStar Baseball player progress tracker for sprint times and throwing velocity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <header className="border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={48} />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-wide">TRISTAR BASEBALL</span>
              <span className="text-xs text-white/50">Speed &amp; Arm Strength Tracker</span>
            </div>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold tracking-wide">
            <Link href="/" className="hover:text-accent transition-colors">
              DASHBOARD
            </Link>
            <Link href="/entry" className="hover:text-accent transition-colors">
              COACH ENTRY
            </Link>
            <Link href="/log" className="hover:text-accent transition-colors">
              PLAYER ENTRY
            </Link>
          </nav>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">{children}</main>
        <footer className="border-t border-white/10 px-4 sm:px-8 py-4 text-center text-xs text-white/40">
          <a
            href="https://exposuretristarbb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            exposuretristarbb.com
          </a>
        </footer>
      </body>
    </html>
  );
}
