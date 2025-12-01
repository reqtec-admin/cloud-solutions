import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import '@/app/globals.css';
import { Providers } from '@/providers';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { SharedStoreProvider } from '@/lib/sharedStore';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space'
});

export const metadata: Metadata = {
  title: 'Nebula | Multi-cloud control plane',
  description:
    'A dark-mode-first, glassmorphic Nebula control plane concept that unifies compute, storage, network, and Kubernetes for open source clouds.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="nebula">
      <body
        className={`${spaceGrotesk.variable} relative min-h-screen bg-[#010409] text-slate-100`}
      >
        <ParticlesBackground />
        <Providers>
          <SharedStoreProvider>{children}</SharedStoreProvider>
        </Providers>
      </body>
    </html>
  );
}
