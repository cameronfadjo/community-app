import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getAuthErrorMessage } from '@community/firebase';
import { auth, functions } from './config';

/**
 * Register a new user with email and password
 */
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update user profile with display name
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });

      // Send email verification
      await sendEmailVerification(userCredential.user);
    }

    return userCredential;
  } catch (error: any) {
    console.error('Error registering user:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Delete the current user's account and everything tied to it.
 * The removal runs on the server; this then clears the local sign-in.
 */
export const deleteAccount = async (): Promise<void> => {
  try {
    await httpsCallable(functions, 'deleteMyAccount')();
  } catch (error: any) {
    console.error('Error deleting account:', error);
    if (error.code === 'functions/failed-precondition') {
      throw new Error('Partner and admin accounts are closed by contacting us.');
    }
    throw new Error("We couldn't delete your account. Check your connection and try again.");
  }

  // The account no longer exists, so a failure here only means the
  // sign-in was already cleared
  await firebaseSignOut(auth).catch(() => undefined);
};

/**
 * Send email verification to current user
 */
export const sendVerificationEmail = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    await sendEmailVerification(user);
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  displayName?: string,
  photoURL?: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    const updates: { displayName?: string; photoURL?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    await updateProfile(user, updates);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// `getAuthErrorMessage` now lives in `@community/firebase`.
