import { useCallback } from 'react';
import { ActivityColor, EventListing } from '../types';
import { useEventStore } from '../store/eventStore';

export const EVERYTHING_ID = 'everything';

export interface ActivityAppearance {
  label: string;
  icon: string;
  color: ActivityColor;
}

const EVERYTHING: ActivityAppearance = { label: 'Everything', icon: 'everything', color: 'violet' };
const UNKNOWN: ActivityAppearance = { label: 'Event', icon: 'star', color: 'violet' };

/**
 * Looks up how an activity or event should be drawn: its label, icon, and
 * rainbow color.
 */
export const useActivityLookup = () => {
  const activities = useEventStore((state) => state.activities);

  const forActivity = useCallback(
    (activityId: string): ActivityAppearance => {
      if (activityId === EVERYTHING_ID) {
        return EVERYTHING;
      }
      const activity = activities.find((item) => item.id === activityId);
      return activity ? { label: activity.label, icon: activity.icon, color: activity.color } : UNKNOWN;
    },
    [activities]
  );

  /** An event takes the look of the activity being browsed, else its first activity */
  const forEvent = useCallback(
    (event: Pick<EventListing, 'activityIds'>, browsingActivityId?: string): ActivityAppearance => {
      const browsing =
        browsingActivityId && event.activityIds.includes(browsingActivityId)
          ? browsingActivityId
          : event.activityIds[0];
      return browsing ? forActivity(browsing) : UNKNOWN;
    },
    [forActivity]
  );

  return { forActivity, forEvent };
};
