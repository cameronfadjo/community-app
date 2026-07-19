# Shared Packages

This directory will hold reusable packages shared across the apps in `../apps/`.

## Planned packages (Step 2 of foundation reset)

- **`@community/types`** — Shared TypeScript types (User, Venue, Review, Offer, etc.)
- **`@community/firebase`** — Firebase config + service layer (auth, firestore CRUD, storage)
- **`@community/ui`** — Reusable UI primitives for the Next.js dashboards (Button, Modal, Toast, DataTable, StatusBadge, FilterButtons, etc.)

## How it works

Each package will be a separate workspace member with its own `package.json` and `tsconfig.json`. Apps reference them via the workspace protocol, e.g.:

```json
{
  "dependencies": {
    "@community/types": "workspace:*",
    "@community/firebase": "workspace:*"
  }
}
```

Turborepo handles the build pipeline — `^build` in `turbo.json` ensures shared packages are built before the apps that depend on them.
