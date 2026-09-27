# Shared packages

Code shared by the apps in `../apps/`.

| Package | What it holds |
|---|---|
| `@community/types` | Types that mirror the database, and the tested rules for events, perks, nudges, and sign-up |
| `@community/firebase` | Firebase setup, collection names, and sign-in helpers for the dashboards |
| `@community/ui` | Pieces shared by the two dashboards: sign-in context, toasts, badges |

Apps use the built output, so build the packages after changing them:

```bash
pnpm turbo build --filter='./packages/*'
```
