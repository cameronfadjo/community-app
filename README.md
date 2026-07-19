# Community Platform

Monorepo for the Community App ecosystem.

## Structure

```
community-platform/
├── apps/
│   ├── community/          # Expo / React Native consumer app
│   ├── admin-dashboard/    # Next.js internal admin dashboard
│   └── partner-dashboard/  # Next.js partner dashboard
├── packages/               # Shared libraries (added in step 2)
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
pnpm --filter community dev          # Expo
pnpm --filter admin-dashboard dev    # localhost:3000
pnpm --filter partner-dashboard dev  # localhost:3001

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
pnpm --filter admin-dashboard add some-package

# Add a dev dependency to the workspace root
pnpm add -Dw some-package

# Run a script in one app
pnpm --filter community start
```

## Documentation

See `docs/` for:

- `PROJECT_HISTORY.md` — Phase milestones, security fixes, roadmap
- `OPERATIONS.md` — Deployment, role management, troubleshooting
- `TESTING.md` — Manual testing guide
- `PARTNER_DASHBOARD.md` — Partner Dashboard reference
