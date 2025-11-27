'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Copy, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AccentButton } from './ui/AccentButton';
import { Toast } from './Toast';

const resourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  region: z.string().min(2, 'Region is required'),
  description: z.string().max(200).optional()
});

type Resource = z.infer<typeof resourceSchema> & {
  id: string;
  createdAt: string;
};

type ResourceCRUDProps = {
  title: string;
  resourceType: string;
  initialResources?: Resource[];
};

export function ResourceCRUD({ title, resourceType, initialResources = [] }: ResourceCRUDProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: '',
      region: 'us-west-2',
      description: ''
    }
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreate = (data: z.infer<typeof resourceSchema>) => {
    const newResource: Resource = {
      ...data,
      id: `res-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setResources((prev) => [newResource, ...prev]);
    form.reset();
    setShowForm(false);
    showNotification(`Created ${resourceType}: ${data.name}`);
  };

  const handleUpdate = (data: z.infer<typeof resourceSchema>) => {
    if (!editingResource) return;
    setResources((prev) =>
      prev.map((r) => (r.id === editingResource.id ? { ...r, ...data } : r))
    );
    form.reset();
    setEditingResource(null);
    setShowForm(false);
    showNotification(`Updated ${resourceType}: ${data.name}`);
  };

  const handleDelete = (id: string) => {
    const resource = resources.find((r) => r.id === id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    showNotification(`Deleted ${resourceType}: ${resource?.name || 'resource'}`);
  };

  const handleClone = (resource: Resource) => {
    const cloned: Resource = {
      ...resource,
      id: `res-${Date.now()}`,
      name: `${resource.name} (copy)`,
      createdAt: new Date().toISOString()
    };
    setResources((prev) => [cloned, ...prev]);
    showNotification(`Cloned ${resourceType}: ${resource.name}`);
  };

  const startEdit = (resource: Resource) => {
    setEditingResource(resource);
    form.reset({
      name: resource.name,
      region: resource.region,
      description: resource.description || ''
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage {resourceType.toLowerCase()} resources. Create, edit, clone, and delete as needed.
          </p>
        </div>
        <AccentButton
          onClick={() => {
            setEditingResource(null);
            form.reset();
            setShowForm(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create {resourceType}
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
              {editingResource ? 'Edit' : 'Create'} {resourceType}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingResource(null);
                form.reset();
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form
            onSubmit={form.handleSubmit(editingResource ? handleUpdate : handleCreate)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</label>
              <input
                {...form.register('name')}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                placeholder={`${resourceType} name`}
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
              <AccentButton type="submit">{editingResource ? 'Update' : 'Create'}</AccentButton>
              <AccentButton
                variant="ghost"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingResource(null);
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
        {resources.map((resource) => (
          <motion.div
            key={resource.id}
            whileHover={{ scale: 1.02 }}
            className="glass-card flex flex-col gap-3 rounded-3xl border border-slate-800/60 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white">{resource.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{resource.region}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(resource)}
                  className="text-slate-400 hover:text-cyan-300 transition"
                  aria-label="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleClone(resource)}
                  className="text-slate-400 hover:text-cyan-300 transition"
                  aria-label="Clone"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="text-slate-400 hover:text-rose-400 transition"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {resource.description && (
              <p className="text-sm text-slate-300">{resource.description}</p>
            )}
            <p className="text-xs text-slate-500">
              Created {new Date(resource.createdAt).toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      {resources.length === 0 && (
        <div className="glass-card rounded-3xl border border-slate-800/60 p-12 text-center">
          <p className="text-slate-400">No {resourceType.toLowerCase()} resources yet.</p>
          <p className="text-sm text-slate-500 mt-2">Click "Create {resourceType}" to get started.</p>
        </div>
      )}

      {showToast && (
        <Toast message={showToast.message} type={showToast.type} onClose={() => setShowToast(null)} />
      )}
    </div>
  );
}

