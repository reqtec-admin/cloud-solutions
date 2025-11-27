'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Network = {
  id: string;
  name: string;
  cidr: string;
  subnets: string[];
  throughput: number;
  region: string;
  description?: string;
  createdAt: string;
};

export type SecurityGroup = {
  id: string;
  name: string;
  region: string;
  description?: string;
  rules: {
    type: 'ingress' | 'egress';
    protocol: string;
    port: number;
    source: string;
  }[];
  createdAt: string;
};

type SharedStore = {
  networks: Network[];
  securityGroups: SecurityGroup[];
  setNetworks: (networks: Network[]) => void;
  addNetwork: (network: Network) => void;
  updateNetwork: (id: string, network: Partial<Network>) => void;
  deleteNetwork: (id: string) => void;
  setSecurityGroups: (groups: SecurityGroup[]) => void;
  addSecurityGroup: (group: SecurityGroup) => void;
  updateSecurityGroup: (id: string, group: Partial<SecurityGroup>) => void;
  deleteSecurityGroup: (id: string) => void;
};

const initialNetworks: Network[] = [
  {
    id: 'net-1',
    name: 'Aurora Backbone',
    cidr: '10.0.0.0/16',
    subnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24', '10.0.4.0/24'],
    throughput: 250,
    region: 'us-west-2',
    description: 'Primary backbone network for production workloads',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
  },
  {
    id: 'net-2',
    name: 'Nebula Mesh',
    cidr: '192.168.10.0/24',
    subnets: ['192.168.10.0/26', '192.168.10.64/26'],
    throughput: 86,
    region: 'us-west-2',
    description: 'Service mesh network for microservices',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
  },
  {
    id: 'net-3',
    name: 'Orion Transit',
    cidr: '172.16.0.0/16',
    subnets: ['172.16.1.0/24', '172.16.2.0/24'],
    throughput: 180,
    region: 'eu-central-1',
    description: 'Cross-region transit network',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
  },
  {
    id: 'net-4',
    name: 'Photon Edge',
    cidr: '10.1.0.0/16',
    subnets: ['10.1.1.0/24', '10.1.2.0/24', '10.1.3.0/24'],
    throughput: 320,
    region: 'ap-southeast-1',
    description: 'Edge network for CDN and global distribution',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'net-5',
    name: 'Atlas Private',
    cidr: '10.2.0.0/16',
    subnets: ['10.2.1.0/24'],
    throughput: 95,
    region: 'us-east-1',
    description: 'Private network for internal services',
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString()
  },
  {
    id: 'net-6',
    name: 'Violet Gateway',
    cidr: '10.3.0.0/16',
    subnets: ['10.3.1.0/24', '10.3.2.0/24'],
    throughput: 150,
    region: 'us-west-1',
    description: 'API gateway network',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'net-7',
    name: 'Icarus Development',
    cidr: '10.4.0.0/16',
    subnets: ['10.4.1.0/24'],
    throughput: 45,
    region: 'us-west-2',
    description: 'Development and testing network',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'net-8',
    name: 'Titan Production',
    cidr: '10.5.0.0/16',
    subnets: ['10.5.1.0/24', '10.5.2.0/24'],
    throughput: 500,
    region: 'us-west-2',
    description: 'High-performance production network',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString()
  },
  {
    id: 'net-9',
    name: 'Helios Staging',
    cidr: '10.6.0.0/16',
    subnets: ['10.6.1.0/24'],
    throughput: 75,
    region: 'us-east-1',
    description: 'Staging environment network',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString()
  },
  {
    id: 'net-10',
    name: 'Polaris Analytics',
    cidr: '10.7.0.0/16',
    subnets: ['10.7.1.0/24', '10.7.2.0/24'],
    throughput: 200,
    region: 'eu-west-1',
    description: 'Data analytics and processing network',
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString()
  },
  {
    id: 'net-11',
    name: 'Nova Database',
    cidr: '10.8.0.0/16',
    subnets: ['10.8.1.0/24'],
    throughput: 120,
    region: 'us-west-2',
    description: 'Database cluster network',
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString()
  },
  {
    id: 'net-12',
    name: 'Comet Cache',
    cidr: '10.9.0.0/16',
    subnets: ['10.9.1.0/24'],
    throughput: 300,
    region: 'us-east-1',
    description: 'Caching layer network',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
  },
  {
    id: 'net-13',
    name: 'Meteor Queue',
    cidr: '10.10.0.0/16',
    subnets: ['10.10.1.0/24'],
    throughput: 90,
    region: 'us-west-2',
    description: 'Message queue network',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString()
  },
  {
    id: 'net-14',
    name: 'Galaxy Storage',
    cidr: '10.11.0.0/16',
    subnets: ['10.11.1.0/24', '10.11.2.0/24'],
    throughput: 400,
    region: 'ap-southeast-1',
    description: 'Object storage network',
    createdAt: new Date(Date.now() - 86400000 * 22).toISOString()
  },
  {
    id: 'net-15',
    name: 'Cosmos Monitoring',
    cidr: '10.12.0.0/16',
    subnets: ['10.12.1.0/24'],
    throughput: 60,
    region: 'us-west-2',
    description: 'Monitoring and observability network',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: 'net-16',
    name: 'Stellar Backup',
    cidr: '10.13.0.0/16',
    subnets: ['10.13.1.0/24'],
    throughput: 110,
    region: 'eu-central-1',
    description: 'Backup and disaster recovery network',
    createdAt: new Date(Date.now() - 86400000 * 35).toISOString()
  }
];

const initialSecurityGroups: SecurityGroup[] = Array.from({ length: 27 }, (_, i) => ({
  id: `sg-${i + 1}`,
  name: `Security Group ${i + 1}`,
  region: ['us-west-2', 'us-east-1', 'eu-central-1', 'ap-southeast-1'][i % 4],
  description: `Security group ${i + 1} for network protection`,
  rules: [
    {
      type: 'ingress',
      protocol: 'tcp',
      port: i % 2 === 0 ? 80 : 443,
      source: i % 3 === 0 ? '0.0.0.0/0' : `10.0.${i}.0/24`
    },
    {
      type: 'egress',
      protocol: 'tcp',
      port: 443,
      source: '0.0.0.0/0'
    }
  ],
  createdAt: new Date(Date.now() - 86400000 * (i + 1)).toISOString()
})).map((sg, i) => ({
  ...sg,
  name: [
    'Web Server SG',
    'Database SG',
    'API Gateway SG',
    'Load Balancer SG',
    'Cache SG',
    'Queue SG',
    'Storage SG',
    'Monitoring SG',
    'Backup SG',
    'Development SG',
    'Staging SG',
    'Production SG',
    'Edge SG',
    'Internal SG',
    'Public SG',
    'Private SG',
    'Analytics SG',
    'Processing SG',
    'CDN SG',
    'DNS SG',
    'VPN SG',
    'Bastion SG',
    'Kubernetes SG',
    'Container SG',
    'Lambda SG',
    'RDS SG',
    'Elasticsearch SG'
  ][i] || `Security Group ${i + 1}`
}));

type SharedStoreContextType = SharedStore;

const SharedStoreContext = createContext<SharedStoreContextType | undefined>(undefined);

export function SharedStoreProvider({ children }: { children: ReactNode }) {
  const [networks, setNetworks] = useState<Network[]>(initialNetworks);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>(initialSecurityGroups);

  const addNetwork = (network: Network) => {
    setNetworks((prev) => [network, ...prev]);
  };

  const updateNetwork = (id: string, updates: Partial<Network>) => {
    setNetworks((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNetwork = (id: string) => {
    setNetworks((prev) => prev.filter((n) => n.id !== id));
  };

  const addSecurityGroup = (group: SecurityGroup) => {
    setSecurityGroups((prev) => [group, ...prev]);
  };

  const updateSecurityGroup = (id: string, updates: Partial<SecurityGroup>) => {
    setSecurityGroups((prev) => prev.map((sg) => (sg.id === id ? { ...sg, ...updates } : sg)));
  };

  const deleteSecurityGroup = (id: string) => {
    setSecurityGroups((prev) => prev.filter((sg) => sg.id !== id));
  };

  return (
    <SharedStoreContext.Provider
      value={{
        networks,
        securityGroups,
        setNetworks,
        addNetwork,
        updateNetwork,
        deleteNetwork,
        setSecurityGroups,
        addSecurityGroup,
        updateSecurityGroup,
        deleteSecurityGroup
      }}
    >
      {children}
    </SharedStoreContext.Provider>
  );
}

export function useSharedStore() {
  const context = useContext(SharedStoreContext);
  if (context === undefined) {
    throw new Error('useSharedStore must be used within SharedStoreProvider');
  }
  return context;
}

