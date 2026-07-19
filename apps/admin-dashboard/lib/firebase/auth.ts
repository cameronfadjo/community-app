/**
 * Admin-dashboard auth helpers, parameterized by the 'admin' role.
 * Wraps `@community/firebase`'s `createRoleAuthHelpers` and re-exports its
 * methods under the names the rest of the app already uses (so existing
 * imports like `import { signInWithEmail } from './auth'` keep working).
 */
import { createRoleAuthHelpers, type RoleAuthHelpers } from '@community/firebase';
import { auth } from './config';

export const authHelpers: RoleAuthHelpers = createRoleAuthHelpers(auth, 'admin');

export const signInWithEmail = authHelpers.signInWithEmail;
export const signOut = authHelpers.signOut;
export const getCurrentUser = authHelpers.getCurrentUser;
export const onAuthChange = authHelpers.onAuthChange;
/** Backward-compatible alias for `hasRequiredRole`. */
export const checkAdminRole = authHelpers.hasRequiredRole;
export const getUserClaims = authHelpers.getUserClaims;
