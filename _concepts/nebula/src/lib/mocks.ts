import { z } from 'zod';

export const resourceFormSchema = z.object({
  name: z.string().min(3),
  type: z.enum(['servers', 'images', 'storage', 'volumes', 'networks', 'securityGroups']),
  region: z.string().min(2),
  tier: z.enum(['standard', 'performance', 'managed']),
  subnet: z.string().optional(),
  description: z.string().max(140).optional()
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export const initialResourceInventory: ResourceFormValues[] = [
  {
    name: 'Orbit Compute Pool',
    type: 'servers',
    region: 'us-west-2',
    tier: 'performance',
    subnet: '10.1.0.0/24',
    description: 'Auto-scaling compute fleet for A/B experiments'
  },
  {
    name: 'Photon Image Cache',
    type: 'images',
    region: 'eu-central-1',
    tier: 'standard',
    description: 'Immutable stems for CI/CD blueprints'
  },
  {
    name: 'Nebula Object Lake',
    type: 'storage',
    region: 'ap-southeast-1',
    tier: 'managed',
    description: 'Replication across AZs with archive tier'
  },
  {
    name: 'Atlas Volume Cache',
    type: 'volumes',
    region: 'us-east-1',
    tier: 'performance',
    subnet: '10.3.10.0/24',
    description: 'High-IOPS NVMe-backed volumes for bursty compute'
  },
  {
    name: 'Aurora Transit Network',
    type: 'networks',
    region: 'us-west-1',
    tier: 'performance',
    subnet: '10.2.0.0/16',
    description: 'Global mesh with WireGuard and subnet automation'
  },
  {
    name: 'Sentinel Security Matrix',
    type: 'securityGroups',
    region: 'global',
    tier: 'managed',
    description: 'Context-aware zero-trust policy envelope'
  }
];

export const dashboardResponseSchema = z.object({
  metrics: z.object({
    cpu: z.number(),
    ram: z.number(),
    network: z.number(),
    storage: z.number(),
    cpuHistory: z.array(z.number()),
    ramHistory: z.array(z.number()),
    networkHistory: z.array(z.number()),
    lastUpdated: z.string()
  }),
  counts: z.object({
    servers: z.number(),
    images: z.number(),
    storage: z.number(),
    volumes: z.number(),
    networks: z.number(),
    securityGroups: z.number(),
    loadBalancers: z.number(),
    kubernetesClusters: z.number()
  }),
  network: z.array(
    z.object({
      name: z.string(),
      cidr: z.string(),
      throughput: z.number(),
      subnets: z.array(z.string())
    })
  ),
  loadBalancers: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['internal', 'edge']),
      status: z.enum(['healthy', 'degraded', 'starting'])
    })
  ),
  kubernetes: z.object({
    clusters: z.array(
      z.object({
        name: z.string(),
        region: z.string(),
        nodes: z.number(),
        status: z.enum(['synced', 'syncing', 'drifted'])
      })
    )
  })
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

export const mockDashboardResponse: DashboardResponse = {
  metrics: {
    cpu: 63,
    ram: 72,
    network: 144,
    storage: 81,
    cpuHistory: [42, 48, 53, 66, 61, 68, 63],
    ramHistory: [58, 60, 64, 71, 70, 73, 72],
    networkHistory: [108, 115, 119, 133, 128, 139, 144],
    lastUpdated: new Date().toISOString()
  },
  counts: {
    servers: 124,
    images: 48,
    storage: 280,
    volumes: 92,
    networks: 16,
    securityGroups: 27,
    loadBalancers: 11,
    kubernetesClusters: 7
  },
  network: [
    {
      name: 'Aurora Backbone',
      cidr: '10.0.0.0/16',
      throughput: 250,
      subnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24']
    },
    {
      name: 'Nebula Mesh',
      cidr: '192.168.10.0/24',
      throughput: 86,
      subnets: ['192.168.10.0/26', '192.168.10.64/26']
    }
  ],
  loadBalancers: [
    { name: 'Hydra Ingress', type: 'edge', status: 'healthy' },
    { name: 'Triton Mesh LB', type: 'internal', status: 'degraded' }
  ],
  kubernetes: {
    clusters: [
      { name: 'Orion Control', region: 'us-west-2', nodes: 9, status: 'synced' },
      { name: 'Violet Gateway', region: 'eu-central-1', nodes: 6, status: 'syncing' },
      { name: 'Icarus Edge', region: 'ap-southeast-1', nodes: 4, status: 'drifted' }
    ]
  }
};

export const resourceTree = [
  {
    label: 'Nebula Org',
    type: 'organization',
    children: [
      {
        label: 'Orbit Project',
        type: 'project',
        children: [
          {
            label: 'Compute Module',
            type: 'module',
            children: [
              { label: 'Servers Pool', type: 'servers' },
              { label: 'Images Lake', type: 'images' }
            ]
          },
          {
            label: 'Storage Module',
            type: 'module',
            children: [
              { label: 'Object Lake', type: 'storage' },
              { label: 'Volumes Grid', type: 'volumes' }
            ]
          },
          {
            label: 'Network Module',
            type: 'module',
            children: [
              { label: 'Aurora Backbone', type: 'network' },
              { label: 'Security Matrix', type: 'securityGroups' }
            ]
          }
        ]
      }
    ]
  }
];

export const advancedShowcase = [
  {
    title: 'Managed Kubernetes',
    description:
      'Cluster automation that keeps control planes patched, node pools right-sized, and GitOps manifests reconciled.',
    stats: '3 clusters syncing, 97% uptime'
  },
  {
    title: 'Load Balancers',
    description:
      'Service mesh-ready LB tiers with edge TLS, auto-healing health checks, and observability built with OpenTelemetry.',
    stats: '11 load balancers, weighted A/B routes'
  }
];

export const liveMapNodes = [
  { id: 'gateway', label: 'Gateway', x: 45, y: 20, color: '#38bdf8' },
  { id: 'compute', label: 'Compute', x: 12, y: 60, color: '#c084fc' },
  { id: 'storage', label: 'Storage', x: 78, y: 62, color: '#f472b6' },
  { id: 'network', label: 'Network', x: 50, y: 80, color: '#34d399' }
];

export const liveMapEdges = [
  { from: 'gateway', to: 'compute' },
  { from: 'gateway', to: 'storage' },
  { from: 'compute', to: 'network' },
  { from: 'storage', to: 'network' }
];
