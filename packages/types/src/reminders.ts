/**
 * Reminders for events someone has saved. They are worked out and set on
 * the phone, so nothing about what was saved leaves it.
 */

import { formatDayShort } from './look-ahead';
import type { PlannedNotification } from './notification-plan';
import type { SavedEvent } from './saved';

/** The reminder someone asks for by saving an event */
export const REMINDER_HOURS_BEFORE = 24;
/** Used when the event was saved with less than a day to go */
export const LATE_REMINDER_HOURS_BEFORE = 2;
// A reminder that fires the moment it is set is no use
const MINIMUM_LEAD_MINUTES = 5;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * When to remind about an event: a day before, or two hours before if
 * there is less than a day to go. Null when it is too close to bother.
 */
export const getReminderTimeMs = (startsAtMs: number, nowMs: number): number | null => {
  const earliest = nowMs + MINIMUM_LEAD_MINUTES * MS_PER_MINUTE;

  const dayBefore = startsAtMs - REMINDER_HOURS_BEFORE * MS_PER_HOUR;
  if (dayBefore >= earliest) {
    return dayBefore;
  }

  const sameDay = startsAtMs - LATE_REMINDER_HOURS_BEFORE * MS_PER_HOUR;
  return sameDay >= earliest ? sameDay : null;
};

const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const wordNotification = (
  event: SavedEvent,
  fireAtMs: number,
  discreet: boolean
): Pick<PlannedNotification, 'title' | 'body'> => {
  const isDayBefore = event.startsAtMs - fireAtMs >= REMINDER_HOURS_BEFORE * MS_PER_HOUR;

  if (discreet) {
    return {
      title: isDayBefore
        ? 'Something you saved is tomorrow'
        : `Something you saved starts in ${LATE_REMINDER_HOURS_BEFORE} hours`,
      body: 'Open Community to see what.',
    };
  }

  return {
    title: isDayBefore
      ? `Tomorrow: ${event.title}`
      : `In ${LATE_REMINDER_HOURS_BEFORE} hours: ${event.title}`,
    // The phone can't hear about a change until the app is next opened
    body: `${formatClock(event.startsAtMs)} at ${event.venueName}. Tap to check it's still on.`,
  };
};

/** A reminder for each saved event that is still on and far enough off, soonest first */
export const planSavedReminders = (
  saved: SavedEvent[],
  prefs: { discreet: boolean },
  nowMs: number
): PlannedNotification[] =>
  saved
    .filter((event) => event.status === 'scheduled')
    .flatMap((event) => {
      const fireAtMs = getReminderTimeMs(event.startsAtMs, nowMs);
      if (fireAtMs === null) {
        return [];
      }
      return [
        {
          id: `saved_${event.eventId}`,
          kind: 'saved_reminder' as const,
          fireAtMs,
          ...wordNotification(event, fireAtMs, prefs.discreet),
          eventId: event.eventId,
        },
      ];
    })
    .sort((a, b) => a.fireAtMs - b.fireAtMs);

/**
 * Where someone stands with reminders:
 * - on: they will get them
 * - ask: the phone hasn't been asked for permission yet
 * - off: they have switched reminders off in the app
 * - blocked: they have refused notifications in the phone's settings
 * - unsupported: a web browser, which can't send them
 */
export type ReminderStatus = 'on' | 'ask' | 'off' | 'blocked' | 'unsupported';

export interface ReminderStatusInput {
  /** False in a web browser */
  supported: boolean;
  /** The person's own choice in the app */
  wanted: boolean;
  permission: 'granted' | 'undetermined' | 'denied';
}

export const getReminderStatus = ({
  supported,
  wanted,
  permission,
}: ReminderStatusInput): ReminderStatus => {
  if (!wanted) return 'off';
  if (!supported) return 'unsupported';
  if (permission === 'granted') return 'on';
  return permission === 'denied' ? 'blocked' : 'ask';
};

/** One line telling someone what to expect after saving an event */
export const describeReminder = (
  status: ReminderStatus,
  startsAtMs: number,
  nowMs: number
): string => {
  if (status === 'unsupported') return 'Reminders are sent by the phone app.';

  // Nothing is offered that can't be delivered
  const fireAtMs = getReminderTimeMs(startsAtMs, nowMs);
  if (fireAtMs === null) {
    return "It's too close to the start for a reminder.";
  }

  if (status === 'ask') {
    return startsAtMs - fireAtMs >= REMINDER_HOURS_BEFORE * MS_PER_HOUR
      ? 'Want a reminder the day before?'
      : `Want a reminder ${LATE_REMINDER_HOURS_BEFORE} hours before?`;
  }
  if (status === 'off') return 'Reminders are switched off.';
  if (status === 'blocked') {
    return "Notifications are turned off for Community in your phone's settings.";
  }

  const day = formatDayShort(fireAtMs, nowMs);
  return `We'll remind you ${day ? `on ${day}` : 'today'} at ${formatClock(fireAtMs)}.`;
};

/**
 * What someone can do about reminders for an event:
 * - allow: let the phone ask them
 * - turn_on: switch reminders back on in the app
 * - open_settings: allow notifications in the phone's settings
 */
export type ReminderAction = 'allow' | 'turn_on' | 'open_settings';

const ACTIONS: Record<ReminderStatus, ReminderAction | null> = {
  on: null,
  ask: 'allow',
  off: 'turn_on',
  blocked: 'open_settings',
  unsupported: null,
};

/** The step to offer beside the reminder line, if there is one worth taking */
export const getReminderAction = (
  status: ReminderStatus,
  startsAtMs: number,
  nowMs: number
): ReminderAction | null =>
  getReminderTimeMs(startsAtMs, nowMs) === null ? null : ACTIONS[status];
