import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  deleteAccount,
  resetPassword,
  getCurrentUser as getFirebaseUser,
} from '../services/firebase/auth';
import {
  createUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
} from '../services/api/users';
import { auth } from '../services/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

interface AuthState {
  // State
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  firebaseUser: null,
  userProfile: null,
  loading: false,
  error: null,
  initialized: false,

  // Initialize auth state listener
  initialize: () => {
    console.log('[AuthStore] Initializing auth listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthStore] Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      if (firebaseUser) {
        // User is signed in, fetch their profile
        try {
          console.log('[AuthStore] Fetching user profile...');
          let profile = await getCurrentUserProfile();

          // If no profile exists, create one (shouldn't happen, but safety check)
          if (!profile) {
            console.log('[AuthStore] No profile found in listener, creating one...');
            await createUserProfile({
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
            });
            await new Promise((resolve) => setTimeout(resolve, 500));
            profile = await getCurrentUserProfile();
          }

          console.log('[AuthStore] Profile fetched successfully');
          set({
            firebaseUser,
            userProfile: profile,
            loading: false,
            initialized: true,
          });
        } catch (error: any) {
          console.error('[AuthStore] Error fetching user profile:', error);
          set({
            firebaseUser,
            userProfile: null,
            loading: false,
            error: error.message,
            initialized: true,
          });
        }
      } else {
        // User is signed out
        console.log('[AuthStore] Setting initialized to true (no user)');
        set({
          firebaseUser: null,
          userProfile: null,
          loading: false,
          initialized: true,
        });
      }
    });

    // Return unsubscribe function for cleanup
    return unsubscribe;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const userCredential = await signInWithEmail(email, password);

      // Fetch user profile
      const profile = await getCurrentUserProfile();

      set({
        firebaseUser: userCredential.user,
        userProfile: profile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    set({ loading: true, error: null });

    try {
      console.log('[AuthStore] Starting Google sign-in...');
      const userCredential = await signInWithGoogle();

      console.log('[AuthStore] Google sign-in successful, checking for profile...');

      // Check if user profile exists
      let profile = await getCurrentUserProfile();

      // If no profile exists, create one (new user)
      if (!profile) {
        console.log('[AuthStore] No profile found, creating new profile...');
        await createUserProfile({
          displayName: userCredential.user.displayName || 'Google User',
          photoURL: userCredential.user.photoURL || undefined,
        });

        // Wait a moment for the profile to be created
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch the newly created profile
        profile = await getCurrentUserProfile();
        console.log('[AuthStore] New profile created');
      } else {
        console.log('[AuthStore] Existing profile found');
      }

      set({
        firebaseUser: userCredential.user,
        userProfile: profile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('[AuthStore] Google sign-in error:', error);
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, displayName: string) => {
    set({ loading: true, error: null });

    try {
      // Register with Firebase Auth
      const userCredential = await registerWithEmail(email, password, displayName);

      // Create user profile in Firestore (Cloud Function will handle this)
      // Wait a moment for the Cloud Function to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the created profile
      let profile = await getCurrentUserProfile();

      // The sign-up form only gets this far once the person has confirmed
      // they are an adult. Keep a record; sign-up still succeeds without it.
      if (profile) {
        try {
          await updateUserProfile(userCredential.user.uid, { confirmedAdultAt: Timestamp.now() });
          profile = { ...profile, confirmedAdultAt: Timestamp.now() };
        } catch (e) {
          console.error('[Auth] Could not record the age confirmation:', e);
        }
      }

      set({
        firebaseUser: userCredential.user,
        userProfile: profile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    set({ loading: true, error: null });

    try {
      await signOut();

      set({
        firebaseUser: null,
        userProfile: null,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Delete the account and everything tied to it
  deleteAccount: async () => {
    set({ loading: true, error: null });

    try {
      await deleteAccount();

      set({
        firebaseUser: null,
        userProfile: null,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Send password reset email
  sendPasswordReset: async (email: string) => {
    set({ loading: true, error: null });

    try {
      await resetPassword(email);

      set({
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>) => {
    const { firebaseUser } = get();
    if (!firebaseUser) {
      throw new Error('No user is signed in');
    }

    set({ loading: true, error: null });

    try {
      await updateUserProfile(firebaseUser.uid, updates);

      // Refresh user profile
      const profile = await getCurrentUserProfile();

      set({
        userProfile: profile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // Refresh user profile from Firestore
  refreshUserProfile: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) {
      return;
    }

    set({ loading: true });

    try {
      const profile = await getCurrentUserProfile();

      set({
        userProfile: profile,
        loading: false,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message,
      });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
