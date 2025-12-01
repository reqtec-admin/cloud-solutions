'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Copy, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Sidebar } from '@/components/Sidebar';
import { AccentButton } from '@/components/ui/AccentButton';
import { Toast } from '@/components/Toast';
import { useSharedStore, type Network } from '@/lib/sharedStore';

const networkSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  cidr: z.string().regex(/^\d+\.\d+\.\d+\.\d+\/\d+$/, 'Invalid CIDR format (e.g., 10.0.0.0/16)'),
  subnets: z.array(z.string().regex(/^\d+\.\d+\.\d+\.\d+\/\d+$/, 'Invalid subnet format')).optional(),
  description: z.string().max(200).optional(),
  region: z.string().min(2),
  throughput: z.number().min(0).optional()
});

export default function NetworkPage() {
  const { networks, addNetwork, updateNetwork, deleteNetwork } = useSharedStore();
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [subnetInput, setSubnetInput] = useState('');

  const form = useForm<z.infer<typeof networkSchema>>({
    resolver: zodResolver(networkSchema),
    defaultValues: {
      name: '',
      cidr: '10.0.0.0/16',
      subnets: [],
      description: '',
      region: 'us-west-2',
      throughput: 100
    }
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const addSubnet = () => {
    if (!subnetInput.trim()) return;
    const currentSubnets = form.getValues('subnets') || [];
    if (!currentSubnets.includes(subnetInput.trim())) {
      form.setValue('subnets', [...currentSubnets, subnetInput.trim()]);
      setSubnetInput('');
    }
  };

  const removeSubnet = (subnet: string) => {
    const currentSubnets = form.getValues('subnets') || [];
    form.setValue('subnets', currentSubnets.filter((s) => s !== subnet));
  };

  const handleCreate = (data: z.infer<typeof networkSchema>) => {
    const newNetwork: Network = {
      ...data,
      id: `net-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subnets: data.subnets || [],
      throughput: data.throughput || 100
    };
    addNetwork(newNetwork);
    form.reset();
    setSubnetInput('');
    setShowForm(false);
    showNotification(`Created network: ${data.name}`);
  };

  const handleUpdate = (data: z.infer<typeof networkSchema>) => {
    if (!editingNetwork) return;
    updateNetwork(editingNetwork.id, {
      ...data,
      subnets: data.subnets || [],
      throughput: data.throughput || editingNetwork.throughput
    });
    form.reset();
    setEditingNetwork(null);
    setShowForm(false);
    setSubnetInput('');
    showNotification(`Updated network: ${data.name}`);
  };

  const handleDelete = (id: string) => {
    const network = networks.find((n) => n.id === id);
    deleteNetwork(id);
    showNotification(`Deleted network: ${network?.name || 'network'}`);
  };

  const handleClone = (network: Network) => {
    const cloned: Network = {
      ...network,
      id: `net-${Date.now()}`,
      name: `${network.name} (copy)`,
      createdAt: new Date().toISOString()
    };
    addNetwork(cloned);
    showNotification(`Cloned network: ${network.name}`);
  };

  const startEdit = (network: Network) => {
    setEditingNetwork(network);
    form.reset({
      name: network.name,
      cidr: network.cidr,
      subnets: network.subnets,
      description: network.description || '',
      region: network.region,
      throughput: network.throughput
    });
    setShowForm(true);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <section className="ml-20 flex flex-1 flex-col gap-6 px-6 py-6 md:ml-24 lg:ml-28 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Networks</h1>
              <p className="mt-2 text-sm text-slate-400">
                Manage network resources with CIDR and subnet configuration.
              </p>
            </div>
            <AccentButton
              onClick={() => {
                setEditingNetwork(null);
                form.reset();
                setSubnetInput('');
                setShowForm(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Network
            </AccentButton>
          </div>

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl border border-slate-800/60 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {editingNetwork ? 'Edit' : 'Create'} Network
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingNetwork(null);
                    form.reset();
                    setSubnetInput('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={form.handleSubmit(editingNetwork ? handleUpdate : handleCreate)}
                className="grid gap-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</label>
                    <input
                      {...form.register('name')}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      placeholder="Network name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">CIDR</label>
                    <input
                      {...form.register('cidr')}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      placeholder="10.0.0.0/16"
                    />
                    {form.formState.errors.cidr && (
                      <p className="text-xs text-rose-400">{form.formState.errors.cidr.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Region</label>
                    <input
                      {...form.register('region')}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      placeholder="us-west-2"
                    />
                    {form.formState.errors.region && (
                      <p className="text-xs text-rose-400">{form.formState.errors.region.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Throughput (Gbps)</label>
                    <input
                      type="number"
                      {...form.register('throughput', { valueAsNumber: true })}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Subnets</label>
                  <div className="flex gap-2">
                    <input
                      value={subnetInput}
                      onChange={(e) => setSubnetInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubnet();
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      placeholder="10.0.1.0/24"
                    />
                    <AccentButton type="button" onClick={addSubnet}>
                      Add
                    </AccentButton>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(form.watch('subnets') || []).map((subnet) => (
                      <span
                        key={subnet}
                        className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-xs text-slate-300"
                      >
                        {subnet}
                        <button
                          type="button"
                          onClick={() => removeSubnet(subnet)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Description</label>
                  <textarea
                    {...form.register('description')}
                    className="h-24 w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-3">
                  <AccentButton type="submit">{editingNetwork ? 'Update' : 'Create'}</AccentButton>
                  <AccentButton
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingNetwork(null);
                      form.reset();
                      setSubnetInput('');
                    }}
                  >
                    Cancel
                  </AccentButton>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {networks.map((network) => (
              <motion.div
                key={network.id}
                whileHover={{ scale: 1.02 }}
                className="glass-card flex flex-col gap-3 rounded-3xl border border-slate-800/60 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">{network.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{network.cidr}</p>
                    <p className="text-xs text-slate-500 mt-1">{network.region} · {network.throughput} Gbps</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(network)}
                      className="text-slate-400 hover:text-cyan-300 transition"
                      aria-label="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleClone(network)}
                      className="text-slate-400 hover:text-cyan-300 transition"
                      aria-label="Clone"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(network.id)}
                      className="text-slate-400 hover:text-rose-400 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {network.subnets.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Subnets</p>
                    <div className="flex flex-wrap gap-1">
                      {network.subnets.map((subnet) => (
                        <span
                          key={subnet}
                          className="rounded-full border border-slate-700/60 bg-slate-900/50 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {subnet}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {network.description && (
                  <p className="text-sm text-slate-300">{network.description}</p>
                )}
                <p className="text-xs text-slate-500">
                  Created {new Date(network.createdAt).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>

          {networks.length === 0 && (
            <div className="glass-card rounded-3xl border border-slate-800/60 p-12 text-center">
              <p className="text-slate-400">No networks yet.</p>
              <p className="text-sm text-slate-500 mt-2">Click "Create Network" to get started.</p>
            </div>
          )}

          {showToast && (
            <Toast message={showToast.message} type={showToast.type} onClose={() => setShowToast(null)} />
          )}
        </div>
      </section>
    </div>
  );
}

