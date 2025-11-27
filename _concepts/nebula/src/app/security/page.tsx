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
import { useSharedStore, type SecurityGroup } from '@/lib/sharedStore';

const securityGroupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  region: z.string().min(2, 'Region is required'),
  description: z.string().max(200).optional(),
  rules: z.array(
    z.object({
      type: z.enum(['ingress', 'egress']),
      protocol: z.string(),
      port: z.number(),
      source: z.string()
    })
  ).optional()
});

export default function SecurityPage() {
  const { securityGroups, addSecurityGroup, updateSecurityGroup, deleteSecurityGroup } = useSharedStore();
  const [editingGroup, setEditingGroup] = useState<SecurityGroup | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const form = useForm<z.infer<typeof securityGroupSchema>>({
    resolver: zodResolver(securityGroupSchema),
    defaultValues: {
      name: '',
      region: 'us-west-2',
      description: '',
      rules: []
    }
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreate = (data: z.infer<typeof securityGroupSchema>) => {
    const newGroup: SecurityGroup = {
      ...data,
      id: `sg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rules: data.rules || []
    };
    addSecurityGroup(newGroup);
    form.reset();
    setShowForm(false);
    showNotification(`Created security group: ${data.name}`);
  };

  const handleUpdate = (data: z.infer<typeof securityGroupSchema>) => {
    if (!editingGroup) return;
    updateSecurityGroup(editingGroup.id, {
      ...data,
      rules: data.rules || editingGroup.rules
    });
    form.reset();
    setEditingGroup(null);
    setShowForm(false);
    showNotification(`Updated security group: ${data.name}`);
  };

  const handleDelete = (id: string) => {
    const group = securityGroups.find((sg) => sg.id === id);
    deleteSecurityGroup(id);
    showNotification(`Deleted security group: ${group?.name || 'security group'}`);
  };

  const handleClone = (group: SecurityGroup) => {
    const cloned: SecurityGroup = {
      ...group,
      id: `sg-${Date.now()}`,
      name: `${group.name} (copy)`,
      createdAt: new Date().toISOString()
    };
    addSecurityGroup(cloned);
    showNotification(`Cloned security group: ${group.name}`);
  };

  const startEdit = (group: SecurityGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      region: group.region,
      description: group.description || '',
      rules: group.rules
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
              <h1 className="text-3xl font-semibold text-white">Security Groups</h1>
              <p className="mt-2 text-sm text-slate-400">
                Manage security groups and firewall rules for your resources.
              </p>
            </div>
            <AccentButton
              onClick={() => {
                setEditingGroup(null);
                form.reset();
                setShowForm(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Security Group
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
                  {editingGroup ? 'Edit' : 'Create'} Security Group
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingGroup(null);
                    form.reset();
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={form.handleSubmit(editingGroup ? handleUpdate : handleCreate)}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</label>
                  <input
                    {...form.register('name')}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="Security group name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
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
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Description</label>
                  <textarea
                    {...form.register('description')}
                    className="h-24 w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-3 sm:col-span-2">
                  <AccentButton type="submit">{editingGroup ? 'Update' : 'Create'}</AccentButton>
                  <AccentButton
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingGroup(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </AccentButton>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {securityGroups.map((group) => (
              <motion.div
                key={group.id}
                whileHover={{ scale: 1.02 }}
                className="glass-card flex flex-col gap-3 rounded-3xl border border-slate-800/60 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">{group.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{group.region}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(group)}
                      className="text-slate-400 hover:text-cyan-300 transition"
                      aria-label="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleClone(group)}
                      className="text-slate-400 hover:text-cyan-300 transition"
                      aria-label="Clone"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-slate-400 hover:text-rose-400 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-slate-300">{group.description}</p>
                )}
                {group.rules.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Rules</p>
                    <div className="flex flex-wrap gap-1">
                      {group.rules.slice(0, 3).map((rule, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-slate-700/60 bg-slate-900/50 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {rule.type} {rule.protocol}:{rule.port}
                        </span>
                      ))}
                      {group.rules.length > 3 && (
                        <span className="text-xs text-slate-500">+{group.rules.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Created {new Date(group.createdAt).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>

          {securityGroups.length === 0 && (
            <div className="glass-card rounded-3xl border border-slate-800/60 p-12 text-center">
              <p className="text-slate-400">No security groups yet.</p>
              <p className="text-sm text-slate-500 mt-2">Click "Create Security Group" to get started.</p>
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
