'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dev/token', label: 'Token Tester' },   // was /dev/token
  { href: '/qr', label: 'Generate QR' },          // was /qr
  { href: '/stage', label: 'Stage Screen' },      // was /stage
];

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f1a]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0b0f1a]/60 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="h-5 w-5 rounded grid place-items-center bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
            <span className="text-[10px]">✦</span>
          </div>
          <span className="text-white font-semibold tracking-wide">Move</span>
          <span className="text-slate-400 text-sm">Artist Dashboard</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm rounded-lg px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
