import { describe, expect, it } from 'vitest';
import {
  describeReminder,
  getReminderAction,
  getReminderStatus,
  getReminderTimeMs,
  planSavedReminders,
} from './reminders';
import type { SavedEvent } from './saved';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Saturday, Sept 26 2026, 8 PM
const start = new Date(2026, 8, 26, 20, 0).getTime();

const saved = (overrides: Partial<SavedEvent> = {}): SavedEvent => ({
  eventId: 'event_1',
  title: 'Drag bingo',
  venueName: 'Chez Est',
  activityIds: ['drag-shows'],
  startsAtMs: start,
  endsAtMs: start + 3 * HOUR,
  status: 'scheduled',
  savedAtMs: start - 72 * HOUR,
  ...overrides,
});

describe('getReminderTimeMs', () => {
  it('is a day before the event starts', () => {
    expect(getReminderTimeMs(start, start - 72 * HOUR)).toBe(start - 24 * HOUR);
  });

  it('is two hours before when there is less than a day to go', () => {
    expect(getReminderTimeMs(start, start - 10 * HOUR)).toBe(start - 2 * HOUR);
  });

  it('has none when the event is about to start, or has started', () => {
    expect(getReminderTimeMs(start, start - HOUR)).toBeNull();
    expect(getReminderTimeMs(start, start + HOUR)).toBeNull();
  });

  it('leaves a few minutes, so a reminder never arrives the moment it is set', () => {
    // A day before is two minutes from now, which is too soon to be useful
    expect(getReminderTimeMs(start, start - 24 * HOUR - 2 * MIN)).toBe(start - 2 * HOUR);
    expect(getReminderTimeMs(start, start - 2 * HOUR - 2 * MIN)).toBeNull();
  });
});

describe('planSavedReminders', () => {
  const now = start - 72 * HOUR;
  const open = { discreet: false };

  it('reminds the day before, with the time and the place', () => {
    expect(planSavedReminders([saved()], open, now)).toEqual([
      {
        id: 'saved_event_1',
        kind: 'saved_reminder',
        fireAtMs: start - 24 * HOUR,
        title: 'Tomorrow: Drag bingo',
        body: "8:00 PM at Chez Est. Tap to check it's still on.",
        eventId: 'event_1',
      },
    ]);
  });

  it('says so when the event is two hours away', () => {
    const [reminder] = planSavedReminders([saved()], open, start - 10 * HOUR);
    expect(reminder).toMatchObject({
      fireAtMs: start - 2 * HOUR,
      title: 'In 2 hours: Drag bingo',
      body: "8:00 PM at Chez Est. Tap to check it's still on.",
    });
  });

  it('leaves out names when asked to be discreet', () => {
    const [dayBefore] = planSavedReminders([saved()], { discreet: true }, now);
    expect(dayBefore).toMatchObject({
      title: 'Something you saved is tomorrow',
      body: 'Open Community to see what.',
    });

    const [sameDay] = planSavedReminders([saved()], { discreet: true }, start - 10 * HOUR);
    expect(sameDay?.title).toBe('Something you saved starts in 2 hours');
  });

  it('skips an event that was cancelled', () => {
    expect(planSavedReminders([saved({ status: 'cancelled' })], open, now)).toEqual([]);
  });

  it('skips an event that is too close to remind about', () => {
    expect(planSavedReminders([saved()], open, start - HOUR)).toEqual([]);
  });

  it('lists them soonest first', () => {
    const reminders = planSavedReminders(
      [
        saved({ eventId: 'later', startsAtMs: start + 48 * HOUR }),
        saved({ eventId: 'sooner', startsAtMs: start }),
      ],
      open,
      now
    );
    expect(reminders.map((reminder) => reminder.eventId)).toEqual(['sooner', 'later']);
  });
});

describe('getReminderStatus', () => {
  const phone = { supported: true, wanted: true };

  it('is on once the phone allows notifications', () => {
    expect(getReminderStatus({ ...phone, permission: 'granted' })).toBe('on');
  });

  it('needs asking when the phone has not been asked yet', () => {
    expect(getReminderStatus({ ...phone, permission: 'undetermined' })).toBe('ask');
  });

  it('is blocked when the person has said no to the phone', () => {
    expect(getReminderStatus({ ...phone, permission: 'denied' })).toBe('blocked');
  });

  it('is off when the person has switched reminders off, whatever the phone allows', () => {
    expect(getReminderStatus({ ...phone, wanted: false, permission: 'granted' })).toBe('off');
    expect(getReminderStatus({ supported: false, wanted: false, permission: 'denied' })).toBe('off');
  });

  it('is not available in a web browser', () => {
    expect(getReminderStatus({ supported: false, wanted: true, permission: 'undetermined' })).toBe(
      'unsupported'
    );
  });
});

describe('describeReminder', () => {
  // Wednesday, Sept 23 2026, noon
  const now = new Date(2026, 8, 23, 12, 0).getTime();

  it('says when the reminder will come', () => {
    expect(describeReminder('on', start, now)).toBe("We'll remind you on Fri at 8:00 PM.");
  });

  it('says today for a reminder later the same day', () => {
    expect(describeReminder('on', start, start - 10 * HOUR)).toBe(
      "We'll remind you today at 6:00 PM."
    );
  });

  it('says so when the event is too close to remind about', () => {
    expect(describeReminder('on', start, start - HOUR)).toBe(
      "It's too close to the start for a reminder."
    );
  });

  it('offers a reminder when the phone has not been asked', () => {
    expect(describeReminder('ask', start, now)).toBe('Want a reminder the day before?');
  });

  it('offers the later reminder when there is less than a day to go', () => {
    expect(describeReminder('ask', start, start - 10 * HOUR)).toBe(
      'Want a reminder 2 hours before?'
    );
  });

  it('offers nothing it cannot deliver when the event is about to start', () => {
    for (const status of ['ask', 'off', 'blocked'] as const) {
      expect(describeReminder(status, start, start - HOUR)).toBe(
        "It's too close to the start for a reminder."
      );
    }
  });

  it('explains when reminders cannot be sent', () => {
    expect(describeReminder('off', start, now)).toBe('Reminders are switched off.');
    expect(describeReminder('blocked', start, now)).toBe(
      "Notifications are turned off for Community in your phone's settings."
    );
    expect(describeReminder('unsupported', start, now)).toBe(
      'Reminders are sent by the phone app.'
    );
  });
});

describe('getReminderAction', () => {
  const now = start - 72 * HOUR;

  it('offers to ask the phone when it has not been asked', () => {
    expect(getReminderAction('ask', start, now)).toBe('allow');
  });

  it('offers to switch reminders back on', () => {
    expect(getReminderAction('off', start, now)).toBe('turn_on');
  });

  it("points to the phone's settings when notifications were refused there", () => {
    expect(getReminderAction('blocked', start, now)).toBe('open_settings');
  });

  it('has nothing to offer when reminders are on, or cannot be sent from here', () => {
    expect(getReminderAction('on', start, now)).toBeNull();
    expect(getReminderAction('unsupported', start, now)).toBeNull();
  });

  it('has nothing to offer when the event is too close to remind about', () => {
    for (const status of ['ask', 'off', 'blocked'] as const) {
      expect(getReminderAction(status, start, start - HOUR)).toBeNull();
    }
  });
});
