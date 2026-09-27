import { Activity } from '../../types';
import { COLLECTIONS, queryDocuments, where, orderBy } from '../firebase/firestore';

/**
 * Get every activity people can browse by, in display order.
 * The list lives in Firestore so it can grow without an app release.
 */
export const getActivities = async (): Promise<Activity[]> => {
  return await queryDocuments<Activity>(COLLECTIONS.ACTIVITIES, [
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  ]);
};
