'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { advancedShowcase } from '@/lib/mocks';

export function AdvancedFeatures() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Advanced Features</span>
        <span className="text-cyan-300">Managed</span>
      </div>
      <Accordion.Root type="single" defaultValue="feature-0" collapsible className="mt-3 space-y-2">
        {advancedShowcase.map((feature, index) => (
          <Accordion.Item
            key={feature.title}
            value={`feature-${index}`}
            className="rounded-2xl border border-slate-700/40 bg-slate-900/50"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-100">
                <span className="font-semibold tracking-[0.2em] text-cyan-200">{feature.title}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="border-t border-slate-800/50 px-4 py-3 text-[0.8rem] text-slate-300">
              <p>{feature.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">{feature.stats}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
