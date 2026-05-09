# Rezulyzer Monorepo

AI-powered assessment & hiring platform.

```
rezulyzer/
├── apps/
│   ├── web/          Next.js 14 (App Router) — frontend, port 3000
│   └── api/          Express + MongoDB — backend, port 8000
├── packages/         (reserved for shared code)
├── package.json      npm workspaces
└── turbo.json        Turborepo task pipeline
```

## Prerequisites

- Node.js >= 18.18
- npm >= 9
- MongoDB connection string (set in `apps/api/.env`)

## Install

```bash
npm install
```

This installs all workspace deps in one pass.

## Configure environment

```bash
# Frontend
cp apps/web/.env.local.example apps/web/.env.local

# Backend (copy and edit with real secrets)
cp apps/api/.env.example apps/api/.env
```

`apps/web/.env.local` should set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
```

## Run

Run both apps in parallel (Turborepo):
```bash
npm run dev
```

Or individually:
```bash
npm run dev:web   # Next.js on http://localhost:3000
npm run dev:api   # Express on http://localhost:8000
```

## Build

```bash
npm run build         # builds all workspaces
npm run build:web     # web only
```

## Production

```bash
npm run start:web     # Next.js production server
npm run start:api     # Express production server
```

## What changed in the migration

The frontend was converted from Vite + React Router (in the legacy
`Rezulyzer-client/` folder) to Next.js 14 App Router under `apps/web/`.
The Express backend was moved unchanged to `apps/api/`.

Key migration choices:

- **Pages are file-system routed** under `apps/web/src/app/` — every route from
  the original `App.jsx` has a corresponding `page.jsx`.
- **Original screens preserved** under `apps/web/src/screens/` (renamed from
  `pages/` to avoid colliding with Next.js's legacy Pages Router).
- **React Router compatibility shim** at `apps/web/src/lib/router-compat.jsx`
  exposes `Link`, `NavLink`, `useNavigate`, `useLocation`, `useParams`,
  `useSearchParams`, and `Navigate` backed by `next/navigation` so component
  source code did not have to be rewritten.
- **Redux Provider** lives in a client boundary at
  `apps/web/src/app/providers.jsx`, wrapped by `AppBootstrap` which restores
  the auth check / toast logic from the old `App.jsx`.
- **Env vars**: `VITE_API_URL` → `NEXT_PUBLIC_API_URL`. `import.meta.env.DEV`
  → `process.env.NODE_ENV !== 'production'`.
- **Route rewrites**: `next.config.js` rewrites `/api/*` to the Express
  backend, so `apiClient` calls work whether the user runs both apps locally
  or behind a single proxy in production.
- **Force-dynamic rendering**: the root layout sets `dynamic = 'force-dynamic'`
  because the SPA components rely heavily on `localStorage`, `useSearchParams`,
  and runtime auth state.

The legacy `Rezulyzer-client/` and `Rezulyzer-server/` directories are kept
in place as a reference and can be removed once you've verified the new
monorepo apps.
