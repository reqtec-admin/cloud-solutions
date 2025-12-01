# Nebula

A Coud Dashboard that is out of this world! 

Nebula... A beautiful, dark-mode-first, glassmorphic multi-cloud control plane

## Instructions

Build me a Cloud Dashboard for the future. 

### Placement:

Place it under _concepts/nebula, I want a cloud dashboard

### Desccription:

This is a dashboard that could be used against any cloud back end. Its primary goal is to replace Horizon (OpenStack), but we want it to be abstract to allow us to chose other infrastrucuture providers in the future.

The intent of this would be to generate interest and excitement amongst investors, partners and clients about how much the visualizatin could be improved for open source cloud systems.

This is a UI that provides all the normal primitives (object storage, compute, disk, network) but also provides more "tailored" solutions like Network File Share and Managed Kubernetes.

### Tech Stack (2025-ready)

- Next.js 14+ (App Router + Server Components)
- TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Lucide React icons (feels premium)
- Recharts or Tremor for beautiful charts
- TanStack Query (React Query) for data fetching
- Zod + React Hook Form for forms
- Keycloak.js + next-auth (custom provider) or OIDC React
- tRPC or custom API routes for type-safe backend
- Glassmorphism + 3D hover effects (Framer Motion)
- Dark mode by default with cyber-neon accents

### Design

- 3D Hover Cards (Framer Motion)
- Live Resource Map (React Flow or lightweight SVG topology)
- Real-time Metrics with WebSockets (CPU, RAM, Network)
- Terraform-like Resource Tree (collapsible hierarchy)
- One-click SSH/Web Console (using Guacamole or GateOne proxy)
- Dark Nebula Particles Background (tsParticles)
- Animated Sidebar with icons that glow on hover

### Dashboard Requirements

#### Landing Page 

- Topology
- Metrics (Usage)
- Tracing
- Observability
- Alerting

#### Demonstrate CRUD on 'Objects':

- Standard Features
Servers (compute)
Images
Storage (Object)
Volume (Disk)
Network... including subnet configuration
Security Groups

- Advanced Features
Load Balancers
Kubernetes


