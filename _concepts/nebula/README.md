# Nebula Control Plane (Concept)

Nebula is a dark-mode-first, glassmorphic multi-cloud control-plane concept built with modern 2025-ready technologies. It showcases real-time metrics, Terraform-like resource trees, live topology, simulated authentication, and CRUD over standard and advanced cloud primitives to impress investors or partners looking for next-gen open source cloud UX.

## Tech Stack

- **Next.js 14+** App Router & Server Components with React 19
- **TypeScript** + **Zod** + **React Hook Form**
- **Tailwind CSS**, **shadcn/ui-inspired accents**, **Radix UI Accordion**
- **Lucide** icons + **Framer Motion** animations
- **Recharts** charts + **react-tsparticles** for nebula particles
- **TanStack Query** for data-fetching + **mock API route**
- **Keycloak.js/next-auth** (simulated login) + **custom providers**

## Getting Started

1. **Install dependencies**
   ```bash
   cd /Users/aarongilliland/dev/sandboxes/reqtec/cloud-solutions/_concepts/nebula
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to see the Nebula dashboard, including the faux login overlay and interactive cards. Form actions are handled entirely in-memory via React state and mock data.

3. **Linting / Build**
   ```bash
   npm run lint
   npm run build
   ```
   Building ensures the App Router and custom components compile, while linting enforces Next.js defaults.

## Architecture Notes

- `src/app/page.tsx` wires together the sidebar, hero header, metric cards, custom forms, topology map, resource tree, and login simulation.
- `src/lib/mocks.ts` contains the Zod schemas, mock dashboard response, and inventory/advanced feature data.
- `src/components/` provides reusable UI for the sidebar, live resource map, resource tree, advanced features, CRUD form, and accent button.
- `src/app/api/dashboard/route.ts` exposes a typed mock API consumed via `useQuery`.
- `src/providers.tsx` wraps the page with a `QueryClientProvider`, and `ParticlesBackground` delivers the nebula particles + glass aesthetic.

## Deploying to Vercel

1. **Import the project**
   - Go to https://vercel.com/new and choose “Import from Git Repository”.
   - Select the `cloud-solutions` repo and point the Root Directory to `_concepts/nebula`.
   - Confirm the build command `npm run build` and output directory `.next`.

2. **Set environment variables (optional)**
   - The demo currently uses mock data, so no env vars are required out of the box.
   - If you integrate Keycloak or real APIs later, add the respective variables under Settings → Environment Variables.

3. **Deploy**
   - Vercel will automatically run `npm install` and `npm run build`.
   - Once the deployment finishes, you’ll get a secure URL where Nebula is live.

4. **Iterate**
   - Push changes to the repo; Vercel will trigger new preview deployments.
   - For previewing with simulated auth, keep `NEXT_PUBLIC_` prefixed variables if introduced later.

## What’s Next

- Connect to a real backend (tRPC, Keycloak, Terraform outputs).
- Add WebSocket feeds for metrics.
- Expand the resource CRUD to persist via API + State.

