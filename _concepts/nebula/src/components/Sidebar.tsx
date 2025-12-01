'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database,
  ShieldCheck,
  Server,
  Cloud,
  Cpu,
  Zap,
  Terminal,
  Layers,
  Sparkles,
  HardDrive
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: Server, href: '/' },
  { label: 'Compute', icon: Cpu, href: '/compute' },
  { label: 'Storage', icon: Database, href: '/storage' },
  { label: 'Disk', icon: HardDrive, href: '/disk' },
  { label: 'Network', icon: Cloud, href: '/network' },
  { label: 'Security', icon: ShieldCheck, href: '/security' }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="nebula-sidebar fixed left-0 top-0 z-20 flex h-full w-20 flex-col items-center gap-6 py-6 transition-all duration-500 md:w-24 lg:w-28">
      <Link href="/" className="flex w-full flex-col items-center gap-3 text-center text-sm uppercase tracking-[0.3em] text-slate-400">
        <Sparkles className="h-4 w-4 text-cyan-300" />
        <span className="text-xs font-semibold text-cyan-300">Nebula</span>
      </Link>
      <div className="flex flex-1 flex-col items-center gap-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex h-12 w-12 items-center justify-center rounded-2xl border transition duration-300 ${
                isActive
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                  : 'border-transparent hover:border-cyan-400 hover:text-cyan-100'
              }`}
              aria-label={item.label}
            >
              <item.icon
                className={`h-5 w-5 transition duration-300 ${
                  isActive ? 'text-cyan-200' : 'text-slate-300 group-hover:text-cyan-200'
                }`}
              />
            </Link>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-3 text-xs text-slate-500">
        <button className="rounded-full border border-cyan-500/60 px-2 py-1 text-cyan-200 transition hover:border-cyan-300">
          <Terminal className="mb-0.5 inline-block h-3 w-3" />
          Console
        </button>
        <button className="rounded-full border border-slate-600 px-3 py-1 text-slate-300 transition hover:border-cyan-300">
          <Layers className="mr-1 inline-block h-3 w-3" /> Stack
        </button>
      </div>
    </aside>
  );
}
