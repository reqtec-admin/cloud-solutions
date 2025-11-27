'use client';

import { resourceTree } from '@/lib/mocks';

function RenderNode({ node }: { node: (typeof resourceTree)[number] }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <details className="group rounded-2xl border border-slate-700/40 bg-slate-900/40 p-3" open>
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-100">
        <span className="text-cyan-200">{node.label}</span>
        {hasChildren && <span className="text-xs text-slate-400">{node.type}</span>}
      </summary>
      {hasChildren && (
        <div className="mt-3 flex flex-col gap-2 pl-2">
          {node.children!.map((child) => (
            <RenderNode key={child.label} node={child as (typeof resourceTree)[number]} />
          ))}
        </div>
      )}
    </details>
  );
}

export function ResourceTree() {
  return (
    <div className="glass-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>Terraform-like tree</span>
        <span className="text-cyan-300">collapsible topology</span>
      </div>
      <div className="flex flex-col gap-2">
        {resourceTree.map((node) => (
          <RenderNode key={node.label} node={node} />
        ))}
      </div>
    </div>
  );
}
