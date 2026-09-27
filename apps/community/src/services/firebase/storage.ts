import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadResult,
  UploadTask,
} from 'firebase/storage';
import { storage } from './config';

/**
 * Storage paths
 */
export const STORAGE_PATHS = {
  USER_PROFILES: 'users',
  VENUES: 'venues',
} as const;

/**
 * Upload a file to Firebase Storage
 */
export const uploadFile = async (
  path: string,
  file: Blob | Uint8Array | ArrayBuffer,
  metadata?: { contentType?: string }
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Upload a file with progress tracking
 */
export const uploadFileWithProgress = (
  path: string,
  file: Blob | Uint8Array | ArrayBuffer,
  onProgress?: (progress: number) => void,
  metadata?: { contentType?: string }
): UploadTask => {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  if (onProgress) {
    uploadTask.on('state_changed', (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress(progress);
    });
  }

  return uploadTask;
};

/**
 * Get download URL for a file
 */
export const getFileURL = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error('Failed to get file URL');
  }
};

/**
 * Delete a file from Firebase Storage
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Upload user profile photo
 */
export const uploadUserPhoto = async (
  userId: string,
  file: Blob | Uint8Array | ArrayBuffer
): Promise<string> => {
  const path = `${STORAGE_PATHS.USER_PROFILES}/${userId}/profile/${Date.now()}.jpg`;
  return uploadFile(path, file, { contentType: 'image/jpeg' });
};

/**
 * Upload venue image
 */
export const uploadVenueImage = async (
  venueId: string,
  file: Blob | Uint8Array | ArrayBuffer,
  index: number
): Promise<string> => {
  const path = `${STORAGE_PATHS.VENUES}/${venueId}/${Date.now()}_${index}.jpg`;
  return uploadFile(path, file, { contentType: 'image/jpeg' });
};
