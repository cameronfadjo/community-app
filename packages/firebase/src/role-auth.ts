import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import type { UserRole } from '@community/types';

export interface RoleAuthHelpers {
  /**
   * Sign in with email/password and verify the user has the required role.
   * If the user authenticates but doesn't have the required role, they are
   * signed back out and an Error is thrown.
   */
  signInWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  getCurrentUser: () => FirebaseUser | null;
  onAuthChange: (callback: (user: FirebaseUser | null) => void) => () => void;
  /** Returns true if the currently signed-in user has the required role. */
  hasRequiredRole: () => Promise<boolean>;
  /** Returns the user's custom claims (or null if not signed in). */
  getUserClaims: () => Promise<Record<string, unknown> | null>;
}

export interface RoleAuthOptions {
  /**
   * Custom message thrown when a user authenticates but lacks the required role.
   * Defaults to "Access denied. {role} privileges required."
   */
  accessDeniedMessage?: string;
}

/**
 * Build a set of auth helpers parameterized by the role required for the app.
 *
 * Used by the admin and partner dashboards to enforce role-based access. The
 * sign-in flow rejects (and signs out) users whose Firebase custom claims
 * don't include the required role.
 *
 * @example
 * ```ts
 * // apps/admin-dashboard/lib/firebase/auth.ts
 * import { createRoleAuthHelpers } from '@community/firebase';
 * import { auth } from './config';
 *
 * export const { signInWithEmail, signOut, hasRequiredRole } =
 *   createRoleAuthHelpers(auth, 'admin');
 * ```
 */
export function createRoleAuthHelpers(
  auth: Auth,
  requiredRole: UserRole,
  options: RoleAuthOptions = {},
): RoleAuthHelpers {
  const accessDeniedMessage =
    options.accessDeniedMessage ??
    `Access denied. ${requiredRole.charAt(0).toUpperCase()}${requiredRole.slice(1)} privileges required.`;

  return {
    async signInWithEmail(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idTokenResult = await credential.user.getIdTokenResult();

      if (idTokenResult.claims.role !== requiredRole) {
        await firebaseSignOut(auth);
        throw new Error(accessDeniedMessage);
      }
      return credential.user;
    },

    async signOut() {
      await firebaseSignOut(auth);
    },

    getCurrentUser() {
      return auth.currentUser;
    },

    onAuthChange(callback) {
      return onAuthStateChanged(auth, callback);
    },

    async hasRequiredRole() {
      const user = auth.currentUser;
      if (!user) return false;
      try {
        const idTokenResult = await user.getIdTokenResult();
        return idTokenResult.claims.role === requiredRole;
      } catch {
        return false;
      }
    },

    async getUserClaims() {
      const user = auth.currentUser;
      if (!user) return null;
      try {
        const idTokenResult = await user.getIdTokenResult();
        return idTokenResult.claims as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  };
}
