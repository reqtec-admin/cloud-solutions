'use client';

import { useEffect, useMemo, useState } from 'react';
import Keycloak from 'keycloak-js';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Database, ShieldCheck, Server, Satellite, Terminal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { AccentButton } from '@/components/ui/AccentButton';
import { AdvancedFeatures } from '@/components/AdvancedFeatures';
import { LiveResourceMap } from '@/components/LiveResourceMap';
import { ResourceForm } from '@/components/ResourceForm';
import { ResourceTree } from '@/components/ResourceTree';
import { Toast } from '@/components/Toast';
import { Sidebar } from '@/components/Sidebar';
import {
  dashboardResponseSchema,
  initialResourceInventory,
  mockDashboardResponse,
  ResourceFormValues
} from '@/lib/mocks';
import { useSharedStore } from '@/lib/sharedStore';
import { useRouter } from 'next/navigation';

const keycloakConfig = {
  url: 'https://auth.nebula.dev/auth',
  realm: 'nebula',
  clientId: 'nebula-console'
};

type SessionState = {
  user: string;
  persona: string;
  org: string;
};

const tailoredSolutions = [
  {
    title: 'Network File Share',
    description:
      'Converged NFS/SMB service with automated replication, per-share QoS, and audit digests that glide across regions.',
    hint: 'Automate exports + gateways in under 60 seconds'
  },
  {
    title: 'Managed Kubernetes',
    description:
      'Control planes are patched nightly, node pools auto-scale with policy, and GitOps status is visible without VPN.',
    hint: 'GitOps + policy gates + drift alerts'
  }
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const featureLabels: Record<ResourceFormValues['type'], string> = {
  servers: 'Servers (Compute)',
  images: 'Images',
  storage: 'Object Storage',
  volumes: 'Block Volume',
  networks: 'Network',
  securityGroups: 'Security Groups'
};

const fetchDashboard = async () => {
  const response = await fetch('/api/dashboard');
  if (!response.ok) {
    throw new Error('Unable to load dashboard data');
  }

  const payload = await response.json();
  return dashboardResponseSchema.parse(payload);
};

export default function Page() {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, initialData: mockDashboardResponse });
  const [inventory, setInventory] = useState<ResourceFormValues[]>(initialResourceInventory);
  const [session, setSession] = useState<SessionState | null>(null);
  const [liveMetrics, setLiveMetrics] = useState(data.metrics);
  const [mounted, setMounted] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceFormValues | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { networks, securityGroups } = useSharedStore();
  const keycloakInstance = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return new Keycloak(keycloakConfig);
  }, []);

  const cpuHistory = data.metrics.cpuHistory;
  const chartData = useMemo(
    () =>
      cpuHistory.map((value, index) => ({
        name: `T-${cpuHistory.length - index}`,
        value
      })),
    [cpuHistory]
  );

  useEffect(() => {
    setLiveMetrics(data.metrics);
  }, [data.metrics]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      setLiveMetrics((current) => ({
        ...current,
        cpu: clamp(current.cpu + (Math.random() * 6 - 3), 20, 90),
        ram: clamp(current.ram + (Math.random() * 6 - 3), 30, 95),
        network: clamp(current.network + (Math.random() * 8 - 4), 60, 220),
        storage: clamp(current.storage + (Math.random() * 4 - 2), 60, 100),
        lastUpdated: new Date().toISOString()
      }));
    }, 2800);

    return () => clearInterval(heartbeat);
  }, []);

  const counts = data.counts;
  const totalSubnets = networks.reduce((sum, net) => sum + net.subnets.length, 0);
  const displayedNetworks = networks.slice(0, 2);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreate = (resource: ResourceFormValues) => {
    setInventory((prev) => [resource, ...prev]);
    showNotification(`Created ${resource.name} (${resource.type})`);
  };

  const handleDelete = (name: string) => {
    setInventory((prev) => prev.filter((item) => item.name !== name));
    showNotification(`Deleted ${name}`, 'success');
  };

  const handleClone = (resource: ResourceFormValues) => {
    const cloned = { ...resource, name: `${resource.name} (copy)` };
    setInventory((prev) => [cloned, ...prev]);
    showNotification(`Cloned ${resource.name}`);
  };

  const handleUpdate = (oldName: string, updated: ResourceFormValues) => {
    setInventory((prev) => prev.map((item) => (item.name === oldName ? updated : item)));
    setSelectedResource(null);
    showNotification(`Updated ${updated.name}`);
  };

  const handleResourceClick = (resource: ResourceFormValues) => {
    setSelectedResource(resource);
  };

  const handleAuth = (method: 'keycloak' | 'oidc') => {
    const newSession = {
      user: 'Nora Pilot',
      persona: 'Cloud Architect',
      org: method === 'keycloak' ? 'Nebula Labs' : 'Open Source Cloud Collective'
    };
    setSession(newSession);

    console.info(`Simulated ${method} login - ready for Keycloak.js + next-auth custom provider`, {
      keycloak: keycloakInstance?.clientId ?? 'not instanced'
    });
  };

  const authenticatedLabel = session ? `Welcome back, ${session.user}` : 'Nebula control plane';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <section className="ml-20 flex flex-1 flex-col gap-6 px-6 py-6 md:ml-24 lg:ml-28 overflow-y-auto">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-neon md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">{authenticatedLabel}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Nebula | Multi-cloud control plane</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Dark-mode-first, glassmorphic multi-cloud cockpit with live topology, one-click consoles, and real-time
              metrics via WebSocket-style streaming.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AccentButton type="button" className="flex items-center gap-2" onClick={() => console.info('Launch GateOne')}>
              <Terminal className="h-3 w-3" />
              GateOne SSH
            </AccentButton>
            <AccentButton variant="ghost" onClick={() => console.info('Launch Guacamole')}>
              <ArrowRight className="h-3 w-3" />
              Web Console
            </AccentButton>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: 'CPU', value: `${liveMetrics.cpu.toFixed(0)}%`, icon: Cpu, accent: 'from-indigo-500/70 to-cyan-500/30' },
                { label: 'RAM', value: `${liveMetrics.ram.toFixed(0)}%`, icon: Database, accent: 'from-fuchsia-500/40 to-purple-500/30' },
                { label: 'Network', value: `${liveMetrics.network.toFixed(0)} Gbps`, icon: Server, accent: 'from-cyan-500/40 to-emerald-500/30' },
                { label: 'Storage IOPS', value: `${liveMetrics.storage.toFixed(0)} TB`, icon: ShieldCheck, accent: 'from-amber-500/40 to-orange-500/30' }
              ].map((metric) => (
                <motion.div
                  key={metric.label}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => showNotification(`Viewing ${metric.label} metrics: ${metric.value}`)}
                  className="glass-card flex cursor-pointer flex-col gap-2 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-4 shadow-lg shadow-slate-900/50 transition hover:border-cyan-400/60"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-400">
                    <span>{metric.label}</span>
                    <metric.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                    WebSocket feed · {networks[0]?.name || 'Nebula Network'}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div className="glass-card rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-4 shadow-neon" whileHover={{ translateY: -4 }}>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>CPU trend</span>
                <span className="text-cyan-300">synchronized</span>
              </div>
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)' }} />
                    <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={{ r: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                Streamed via mock WebSocket · updated {mounted ? new Date(liveMetrics.lastUpdated).toLocaleTimeString() : '—'}
              </p>
            </motion.div>

            <LiveResourceMap />

            <div className="grid gap-4 md:grid-cols-2">
              {tailoredSolutions.map((solution) => (
                <motion.div
                  key={solution.title}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => showNotification(`Viewing ${solution.title} configuration`)}
                  className="glass-card flex cursor-pointer flex-col gap-2 rounded-3xl border border-slate-800/60 p-4 transition hover:border-cyan-400/60"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                    <span>{solution.title}</span>
                    <span className="text-cyan-300 text-[0.6rem] uppercase tracking-[0.4em]">Tailored</span>
                  </div>
                  <p className="text-sm text-slate-200">{solution.description}</p>
                  <p className="text-[0.65rem] tracking-[0.4em] text-cyan-300">{solution.hint}</p>
                </motion.div>
              ))}
            </div>

            <ResourceForm
              inventory={inventory}
              onCreate={handleCreate}
              onDelete={handleDelete}
              onClone={handleClone}
              onResourceClick={handleResourceClick}
            />
          </div>

          <div className="space-y-6">
            <ResourceTree />
            <AdvancedFeatures />

            <div className="glass-card rounded-3xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>Networks & Security</span>
                <span className="text-cyan-300 text-[0.7rem]">{totalSubnets} subnets</span>
              </div>
              <div className="mt-3 space-y-3">
                {displayedNetworks.map((network) => (
                  <motion.div
                    key={network.id}
                    whileHover={{ translateX: 4 }}
                    onClick={() => {
                      router.push('/network');
                      showNotification(`Navigating to network: ${network.name}`);
                    }}
                    className="cursor-pointer rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 transition hover:border-cyan-400/60 hover:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between text-sm text-white">
                      <p>{network.name}</p>
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">{network.cidr}</p>
                    </div>
                    <p className="text-[0.75rem] text-slate-400">Throughput: {network.throughput} Gbps</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.6rem] tracking-[0.3em] text-slate-500">
                      {network.subnets.map((subnet) => (
                        <span key={subnet} className="resource-pill rounded-full px-2 py-1 text-xs">
                          {subnet}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {networks.length > 2 && (
                  <button
                    onClick={() => router.push('/network')}
                    className="w-full rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 text-xs text-slate-400 transition hover:border-cyan-400/60 hover:text-cyan-300"
                  >
                    View all {networks.length} networks →
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-[0.7rem] text-slate-400">
                <button
                  onClick={() => router.push('/security')}
                  className="hover:text-cyan-300 transition cursor-pointer"
                >
                  Security groups live: {securityGroups.length}
                </button>
                <p>Load balancers: {counts.loadBalancers}</p>
              </div>
            </div>

            <div className="glass-card rounded-3xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>Load Balancers</span>
                <span className="text-cyan-300 text-[0.7rem]">{data.loadBalancers.length} active</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {data.loadBalancers.map((lb) => (
                  <div
                    key={lb.name}
                    onClick={() => showNotification(`Viewing load balancer: ${lb.name} (${lb.type}, ${lb.status})`)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800/60 px-3 py-2 transition hover:border-cyan-400/60 hover:bg-slate-800/40"
                  >
                    <div>
                      <p className="text-white">{lb.name}</p>
                      <p className="text-[0.65rem] text-slate-500">{lb.type} · {lb.status}</p>
                    </div>
                    <span className={`text-[0.6rem] uppercase tracking-[0.3em] ${
                      lb.status === 'healthy' ? 'text-emerald-300' : 
                      lb.status === 'degraded' ? 'text-amber-300' : 
                      'text-slate-400'
                    }`}>
                      {lb.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-3xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>Kubernetes Clusters</span>
                <span className="text-cyan-300">K8s</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {data.kubernetes.clusters.map((cluster) => (
                  <div
                    key={cluster.name}
                    onClick={() => {
                      setSelectedCluster(cluster.name);
                      showNotification(`Viewing cluster: ${cluster.name} (${cluster.nodes} nodes)`);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800/60 px-3 py-2 transition hover:border-cyan-400/60 hover:bg-slate-800/40"
                  >
                    <div>
                      <p className="text-white">{cluster.name}</p>
                      <p className="text-[0.65rem] text-slate-500">{cluster.region} · {cluster.nodes} nodes</p>
                    </div>
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cyan-300">{cluster.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleAuth('keycloak');
              }
            }}
          >
            <div className="glass-card w-full max-w-xl rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-neon">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Identity provider</p>
                  <button
                    onClick={() => handleAuth('keycloak')}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Skip →
                  </button>
                </div>
                <h2 className="text-2xl font-semibold text-white">Simulated login</h2>
                <p className="text-sm text-slate-300">
                  This overlay represents a fake Keycloak.js + next-auth custom provider or OIDC React handshake. Click any button to continue.
                </p>
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAuth('keycloak');
                  }}
                >
                  <input
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-white"
                    placeholder="user@nebula.dev"
                    defaultValue="pilot@nebula.dev"
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-white"
                    placeholder="workspace"
                    defaultValue="nebula-control"
                  />
                  <div className="flex flex-wrap gap-3">
                    <AccentButton type="submit" className="flex-1">Sign in (Keycloak)</AccentButton>
                    <AccentButton variant="ghost" type="button" onClick={() => handleAuth('oidc')}>
                      Continue with OIDC
                    </AccentButton>
                  </div>
                  <AccentButton
                    variant="ghost"
                    type="button"
                    onClick={() => handleAuth('keycloak')}
                    className="w-full text-xs"
                  >
                    Skip Login (Demo Mode)
                  </AccentButton>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {selectedResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-2xl rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 shadow-neon"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold text-white">Resource Details</h3>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</p>
                  <p className="text-white">{selectedResource.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Type</p>
                  <p className="text-white">{featureLabels[selectedResource.type]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Region</p>
                  <p className="text-white">{selectedResource.region}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tier</p>
                  <p className="text-white">{selectedResource.tier}</p>
                </div>
                {selectedResource.subnet && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Subnet</p>
                    <p className="text-white">{selectedResource.subnet}</p>
                  </div>
                )}
                {selectedResource.description && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Description</p>
                    <p className="text-white">{selectedResource.description}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <AccentButton onClick={() => handleClone(selectedResource)}>Clone Resource</AccentButton>
                <AccentButton
                  variant="ghost"
                  onClick={() => {
                    handleDelete(selectedResource.name);
                    setSelectedResource(null);
                  }}
                >
                  Delete
                </AccentButton>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showToast && (
          <Toast message={showToast.message} type={showToast.type} onClose={() => setShowToast(null)} />
        )}
      </section>
    </div>
  );
}
