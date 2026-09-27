# Community Platform

Monorepo for the Community App ecosystem.

## Structure

```
community-platform/
├── apps/
│   ├── community/          # Expo / React Native consumer app
│   ├── admin-dashboard/    # Next.js dashboard for moderation
│   ├── partner-dashboard/  # Next.js dashboard where venues post events
│   └── website/            # Terms, Privacy, and support pages
├── packages/               # Shared types, Firebase helpers, and dashboard UI
├── docs/                   # Project documentation
├── turbo.json              # Turborepo task pipeline
├── pnpm-workspace.yaml     # pnpm workspace definition
└── package.json            # Root workspace config
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)

## Getting Started

```bash
# Install all dependencies for all apps
pnpm install

# Run a specific app
pnpm --filter @community/mobile dev             # Expo
pnpm --filter @community/admin-dashboard dev    # localhost:3000
pnpm --filter @community/partner-dashboard dev  # localhost:3001
pnpm --filter @community/website dev            # localhost:4000

# Run everything (Turborepo will fan out)
pnpm dev

# Build everything
pnpm build

# Lint / type-check / test across all apps
pnpm lint
pnpm type-check
pnpm test
```

## Workspace Commands

```bash
# Add a dependency to a specific app
pnpm --filter @community/admin-dashboard add some-package

# Add a dev dependency to the workspace root
pnpm add -Dw some-package

# Run a script in one app
pnpm --filter @community/mobile start
```

## Documentation

See `docs/` for:

- `PROJECT_HISTORY.md` — How the project got here
- `OPERATIONS.md` — Deployment, roles, troubleshooting
- `STORE_LAUNCH.md` — Everything needed to launch on the app stores
- `OUTREACH.md` — Signing up venues
- `TICKETING.md` — How ticket sales could work
- `launch-connecticut/` — Venue and event leads for the first market
- `legal/` — Draft Terms of Use and Privacy Policy
