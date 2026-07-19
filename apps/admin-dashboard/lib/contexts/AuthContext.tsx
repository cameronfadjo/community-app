'use client';

import { useRouter } from 'next/navigation';
import { createAuthContext } from '@community/ui';
import { authHelpers } from '../firebase/auth';
import type { ReactNode } from 'react';

const { AuthProvider: BaseAuthProvider, useAuth: baseUseAuth } =
  createAuthContext(authHelpers);

/**
 * AuthProvider for the admin dashboard. Redirects unauthorized users to /login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <BaseAuthProvider onSignedOut={() => router.push('/login')}>
      {children}
    </BaseAuthProvider>
  );
}

/**
 * Hook returning auth state. `hasRequiredRole` is `true` when the user has
 * the admin role; aliased as `isAdmin` for backward compatibility.
 */
export function useAuth() {
  const ctx = baseUseAuth();
  return {
    ...ctx,
    /** Backward-compatible alias for `hasRequiredRole`. */
    isAdmin: ctx.hasRequiredRole,
  };
}
