import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for authentication
 * Provides easy access to auth state and methods
 */
export const useAuth = () => {
  const {
    firebaseUser,
    userProfile,
    loading,
    error,
    initialized,
    initialize,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    deleteAccount,
    sendPasswordReset,
    updateProfile,
    refreshUserProfile,
    clearError,
  } = useAuthStore();

  // Initialize auth state listener on mount
  useEffect(() => {
    const unsubscribe = initialize();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialize]);

  // Computed values
  const isAuthenticated = !!firebaseUser;
  const isEmailVerified = firebaseUser?.emailVerified || false;
  const isRejected = userProfile?.moderationStatus === 'rejected';
  const isPremium = userProfile?.subscriptionTier === 'premium';

  return {
    // State
    user: firebaseUser,
    profile: userProfile,
    loading,
    error,
    initialized,

    // Computed
    isAuthenticated,
    isEmailVerified,
    isRejected,
    isPremium,

    // Actions
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    deleteAccount,
    sendPasswordReset,
    updateProfile,
    refreshUserProfile,
    clearError,
  };
};
