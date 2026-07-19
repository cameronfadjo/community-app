import { CheckIn, CheckInFormData } from '../../types';
import {
  COLLECTIONS,
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { getUserProfile } from './users';
import { getVenue } from './venues';

/**
 * Create a new check-in
 */
export const createCheckIn = async (
  venueId: string,
  checkInData: CheckInFormData
): Promise<string> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated to check in');
  }

  // Get user profile for denormalized data
  const userProfile = await getUserProfile(currentUser.uid);
  if (!userProfile) {
    throw new Error('User profile not found');
  }

  // Get venue for denormalized data
  const venue = await getVenue(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Generate unique check-in ID
  const checkInId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const checkIn: Omit<CheckIn, 'createdAt'> = {
    id: checkInId,
    userId: currentUser.uid,
    userName: userProfile.displayName,
    userPhotoURL: userProfile.photoURL,
    venueId,
    venueName: venue.name,
    venueCategory: venue.category,
    caption: checkInData.caption,
    images: checkInData.images,
    visibility: checkInData.visibility,
    likes: 0,
    likedBy: [],
  };

  await createDocument(COLLECTIONS.CHECK_INS, checkInId, checkIn);
  return checkInId;
};

/**
 * Get a check-in by ID
 */
export const getCheckIn = async (checkInId: string): Promise<CheckIn | null> => {
  return await readDocument<CheckIn>(COLLECTIONS.CHECK_INS, checkInId);
};

/**
 * Delete a check-in
 */
export const deleteCheckIn = async (checkInId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const checkIn = await getCheckIn(checkInId);
  if (!checkIn) {
    throw new Error('Check-in not found');
  }

  if (checkIn.userId !== currentUser.uid) {
    throw new Error('You can only delete your own check-ins');
  }

  await deleteDocument(COLLECTIONS.CHECK_INS, checkInId);
};

/**
 * Get check-ins for a venue
 */
export const getVenueCheckIns = async (
  venueId: string,
  limit: number = 20
): Promise<CheckIn[]> => {
  return await queryDocuments<CheckIn>(COLLECTIONS.CHECK_INS, [
    where('venueId', '==', venueId),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
  ]);
};

/**
 * Get check-ins by a user
 */
export const getUserCheckIns = async (userId: string): Promise<CheckIn[]> => {
  return await queryDocuments<CheckIn>(COLLECTIONS.CHECK_INS, [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  ]);
};

/**
 * Get social feed (public check-ins from all users)
 */
export const getSocialFeed = async (limit: number = 50): Promise<CheckIn[]> => {
  return await queryDocuments<CheckIn>(COLLECTIONS.CHECK_INS, [
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
  ]);
};

/**
 * Like a check-in
 */
export const likeCheckIn = async (checkInId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const checkIn = await getCheckIn(checkInId);
  if (!checkIn) {
    throw new Error('Check-in not found');
  }

  if (checkIn.likedBy.includes(currentUser.uid)) {
    // Already liked, do nothing
    return;
  }

  await updateDocument(COLLECTIONS.CHECK_INS, checkInId, {
    likes: checkIn.likes + 1,
    likedBy: arrayUnion(currentUser.uid),
  });
};

/**
 * Unlike a check-in
 */
export const unlikeCheckIn = async (checkInId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }

  const checkIn = await getCheckIn(checkInId);
  if (!checkIn) {
    throw new Error('Check-in not found');
  }

  if (!checkIn.likedBy.includes(currentUser.uid)) {
    // Not liked, do nothing
    return;
  }

  await updateDocument(COLLECTIONS.CHECK_INS, checkInId, {
    likes: Math.max(0, checkIn.likes - 1),
    likedBy: arrayRemove(currentUser.uid),
  });
};

/**
 * Toggle like on a check-in
 */
export const toggleLike = async (
  checkInId: string,
  isLiked: boolean
): Promise<void> => {
  if (isLiked) {
    await unlikeCheckIn(checkInId);
  } else {
    await likeCheckIn(checkInId);
  }
};

/**
 * Check if current user liked a check-in
 */
export const isCheckInLiked = async (checkInId: string): Promise<boolean> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const checkIn = await getCheckIn(checkInId);
  if (!checkIn) {
    return false;
  }

  return checkIn.likedBy.includes(currentUser.uid);
};

/**
 * Get check-in count for a venue
 */
export const getVenueCheckInCount = async (venueId: string): Promise<number> => {
  const checkIns = await getVenueCheckIns(venueId);
  return checkIns.length;
};

/**
 * Get check-in count for a user
 */
export const getUserCheckInCount = async (userId: string): Promise<number> => {
  const checkIns = await getUserCheckIns(userId);
  return checkIns.length;
};
