'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { resourceFormSchema, ResourceFormValues } from '@/lib/mocks';

const featureLabels: Record<ResourceFormValues['type'], string> = {
  servers: 'Servers (Compute)',
  images: 'Images',
  storage: 'Object Storage',
  volumes: 'Block Volume',
  networks: 'Network',
  securityGroups: 'Security Groups'
};

type ResourceFormProps = {
  inventory: ResourceFormValues[];
  onCreate: (resource: ResourceFormValues) => void;
  onDelete: (name: string) => void;
  onClone: (resource: ResourceFormValues) => void;
  onResourceClick?: (resource: ResourceFormValues) => void;
};

export function ResourceForm({ inventory, onCreate, onDelete, onClone, onResourceClick }: ResourceFormProps) {
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      name: '',
      type: 'servers',
      region: 'us-west-2',
      tier: 'performance'
    }
  });

  const typeOptions = useMemo(() => Object.entries(featureLabels), []);

  const handleSubmit = (values: ResourceFormValues) => {
    onCreate(values);
    form.reset();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Live CRUD</span>
        <span className="text-cyan-300">standard features</span>
      </div>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-400">
          <span>Name</span>
          <input
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
            {...form.register('name')}
            placeholder="Nebula Compute"
          />
          <p className="min-h-[1.25rem] text-[0.65rem] text-rose-400">
            {form.formState.errors.name?.message}
          </p>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span>Feature</span>
          <select
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-white"
            {...form.register('type')}
          >
            {typeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span>Region</span>
          <input
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm"
            {...form.register('region')}
            placeholder="eu-central-1"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span>Tier</span>
          <div className="flex gap-2">
            {['standard', 'performance', 'managed'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => form.setValue('tier', tier as ResourceFormValues['tier'])}
                className={`flex-1 rounded-2xl border px-2 py-1 text-xs uppercase tracking-[0.2em] transition ${
                  form.watch('tier') === tier
                    ? 'border-cyan-400 text-cyan-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </label>
        <label className="space-y-1 text-xs text-slate-400 sm:col-span-2">
          <span>Subnet (optional)</span>
          <input
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm"
            {...form.register('subnet')}
            placeholder="10.10.0.0/16"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400 sm:col-span-2">
          <span>Description</span>
          <textarea
            className="h-20 w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm"
            {...form.register('description')}
            placeholder="Summarize what this resource supports"
          />
        </label>
        <button
          type="submit"
          className="sm:col-span-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:from-cyan-400 hover:to-blue-400"
        >
          Provision/resource
        </button>
      </form>
      <div className="mt-4 space-y-2 text-xs text-slate-300">
        {inventory.map((resource) => (
          <div
            key={resource.name}
            onClick={() => onResourceClick?.(resource)}
            className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-slate-700/60 px-3 py-2 transition hover:border-cyan-400/60 hover:bg-slate-800/40"
          >
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span>{resource.name}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                {featureLabels[resource.type]}
              </span>
            </div>
            <div className="flex items-center justify-between text-[0.7rem] text-slate-400">
              <span>{resource.region}</span>
              <span>{resource.tier}</span>
            </div>
            <p className="text-[0.65rem] text-slate-500">{resource.description}</p>
            <div className="flex gap-3 text-[0.65rem] text-slate-400">
              <button
                className="text-cyan-300 hover:text-cyan-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onClone(resource);
                }}
              >
                Clone
              </button>
              <button
                className="text-rose-400 hover:text-rose-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(resource.name);
                }}
              >
                Decommission
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
