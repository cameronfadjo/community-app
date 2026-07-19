'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { RoleAuthHelpers } from '@community/firebase';

export interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  /** True if the user has the role this AuthContext was created for. */
  hasRequiredRole: boolean;
  signOut: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Callback fired when the user signs out, or when an authenticated user
   * is rejected for not having the required role. Use this to redirect
   * (e.g. `() => router.push('/login')`).
   */
  onSignedOut?: () => void;
}

export interface AuthContextBundle {
  AuthProvider: (props: AuthProviderProps) => React.JSX.Element;
  useAuth: () => AuthContextValue;
}

/**
 * Build an `AuthProvider` + `useAuth` pair bound to a specific role.
 *
 * Each dashboard calls this once with its own `RoleAuthHelpers` (created via
 * `createRoleAuthHelpers` from `@community/firebase`) and uses the returned
 * provider/hook throughout the app.
 *
 * The provider:
 *   - subscribes to Firebase auth state
 *   - verifies the signed-in user has the required role
 *   - signs the user out and triggers `onSignedOut` if they don't
 *
 * @example
 * ```tsx
 * // apps/admin-dashboard/lib/contexts/AuthContext.tsx
 * 'use client';
 * import { createAuthContext } from '@community/ui';
 * import { useRouter } from 'next/navigation';
 * import * as authHelpers from '../firebase/auth';
 *
 * const { AuthProvider: BaseProvider, useAuth: baseUseAuth } = createAuthContext(authHelpers);
 *
 * export function AuthProvider({ children }: { children: React.ReactNode }) {
 *   const router = useRouter();
 *   return <BaseProvider onSignedOut={() => router.push('/login')}>{children}</BaseProvider>;
 * }
 * export const useAuth = baseUseAuth;
 * ```
 */
export function createAuthContext(
  helpers: RoleAuthHelpers,
): AuthContextBundle {
  const Context = createContext<AuthContextValue | null>(null);

  function AuthProvider({ children, onSignedOut }: AuthProviderProps) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasRequiredRole, setHasRequiredRole] = useState(false);

    useEffect(() => {
      const unsubscribe = helpers.onAuthChange(async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          const allowed = await helpers.hasRequiredRole();
          setHasRequiredRole(allowed);

          if (!allowed) {
            await helpers.signOut();
            onSignedOut?.();
          }
        } else {
          setHasRequiredRole(false);
        }

        setLoading(false);
      });

      return () => unsubscribe();
    }, [onSignedOut]);

    const handleSignOut = async () => {
      await helpers.signOut();
      onSignedOut?.();
    };

    return (
      <Context.Provider
        value={{
          user,
          loading,
          hasRequiredRole,
          signOut: handleSignOut,
        }}
      >
        {children}
      </Context.Provider>
    );
  }

  function useAuth(): AuthContextValue {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
  }

  return { AuthProvider, useAuth };
}
