/**
 * @community/firebase — Shared Firebase factory and service helpers.
 *
 * Each app calls `createFirebaseClient` with its own env-derived config
 * (Expo apps use `EXPO_PUBLIC_*` env vars; Next.js apps use `NEXT_PUBLIC_*`).
 * Higher-level helpers like `createRoleAuthHelpers` are then bound to the
 * resulting `auth` instance.
 */
export { createFirebaseClient, type FirebaseClient } from './client';
export {
  createRoleAuthHelpers,
  type RoleAuthHelpers,
  type RoleAuthOptions,
} from './role-auth';
export { getAuthErrorMessage } from './auth-errors';
export { COLLECTIONS, type CollectionName } from './collections';
