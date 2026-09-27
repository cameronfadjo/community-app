/**
 * Rules for posting an event. Shared so the dashboard form and any future
 * server-side check agree on what a valid event is.
 */

import { MINIMUM_AGES, type EventFormData } from './event';
import { expandMonthlyRecurrence, expandWeeklyRecurrence } from './event-utils';

export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 600;
export const MAX_ACTIVITIES_PER_EVENT = 3;
/** The apps look back this far for events still running, so none may be longer */
export const MAX_EVENT_HOURS = 12;

const MS_PER_HOUR = 60 * 60 * 1000;

export type EventFormErrors = Partial<Record<keyof EventFormData, string>>;

export interface ValidateOptions {
  /** Editing allows a start in the past, e.g. fixing a typo on tonight's event */
  isEditing?: boolean;
}

/**
 * Turns the form's date and time fields into start and end moments. An end
 * time earlier than the start means the event runs past midnight.
 */
export const resolveEventTimes = (
  date: string,
  startTime: string,
  endTime: string
): { startsAt: Date; endsAt: Date } | null => {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const startParts = /^(\d{2}):(\d{2})$/.exec(startTime);
  const endParts = /^(\d{2}):(\d{2})$/.exec(endTime);
  if (!dateParts || !startParts || !endParts) {
    return null;
  }

  const [year, month, day] = [Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])];
  const startsAt = new Date(year, month, day, Number(startParts[1]), Number(startParts[2]));
  const endsAt = new Date(year, month, day, Number(endParts[1]), Number(endParts[2]));

  if (endsAt.getTime() <= startsAt.getTime()) {
    endsAt.setDate(endsAt.getDate() + 1);
  }

  return { startsAt, endsAt };
};

/** Reads a cover charge typed as dollars. Blank or "free" is no cover. */
export const parseCoverToCents = (input: string): number | null => {
  const text = input.trim().toLowerCase();
  if (text === '' || text === 'free') {
    return 0;
  }

  const match = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    return null;
  }

  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return dollars * 100 + cents;
};

const isWebAddress = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const endOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

/** Returns a message per invalid field. An empty object means the form is valid. */
export const validateEventForm = (
  form: EventFormData,
  nowMs: number,
  options: ValidateOptions = {}
): EventFormErrors => {
  const errors: EventFormErrors = {};

  const title = form.title.trim();
  if (!title) {
    errors.title = 'Give the event a name.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Keep the name under ${MAX_TITLE_LENGTH} characters.`;
  }

  const description = form.description.trim();
  if (!description) {
    errors.description = 'Tell people what to expect.';
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep this under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  if (form.activityIds.length === 0) {
    errors.activityIds = 'Pick at least one activity.';
  } else if (form.activityIds.length > MAX_ACTIVITIES_PER_EVENT) {
    errors.activityIds = `Pick up to ${MAX_ACTIVITIES_PER_EVENT} activities.`;
  }

  if (!form.venueId) {
    errors.venueId = 'Choose where it happens.';
  }

  const startMs = form.startsAt.getTime();
  const endMs = form.endsAt.getTime();

  if (Number.isNaN(startMs)) {
    errors.startsAt = 'Choose a date and start time.';
  } else if (!options.isEditing && startMs < nowMs) {
    errors.startsAt = 'The start time has already passed.';
  }

  if (Number.isNaN(endMs)) {
    errors.endsAt = 'Choose an end time.';
  } else if (endMs <= startMs) {
    errors.endsAt = 'The end must be after the start.';
  } else if (endMs - startMs > MAX_EVENT_HOURS * MS_PER_HOUR) {
    errors.endsAt = `Events can run up to ${MAX_EVENT_HOURS} hours.`;
  }

  if (!Number.isInteger(form.coverCents) || form.coverCents < 0) {
    errors.coverCents = 'Enter the cover as a dollar amount, or leave it blank if free.';
  }

  if (form.ticketUrl && !isWebAddress(form.ticketUrl)) {
    errors.ticketUrl = 'Enter a full web address starting with https://';
  }

  if (!(MINIMUM_AGES as readonly number[]).includes(form.tags.minimumAge)) {
    errors.tags = 'Events must be for people 18 and over.';
  }

  if (form.onBehalf) {
    if (!form.organizerName?.trim()) {
      errors.organizerName = 'Enter who hosts the event.';
    }
    if (!form.onBehalf.detailsSource.trim()) {
      errors.onBehalf = 'Say where the details came from.';
    }
  }

  if (form.repeat !== 'none') {
    if (!form.repeatUntil || Number.isNaN(form.repeatUntil.getTime())) {
      errors.repeatUntil = 'Choose the last date it repeats.';
    } else if (endOfDay(form.repeatUntil).getTime() < startMs) {
      errors.repeatUntil = 'The last date must be on or after the first event.';
    }
  }

  return errors;
};

export type HostConfirmation = 'confirmed' | 'unconfirmed';

/**
 * Whether the host stands behind the details. An event is unconfirmed when
 * an admin posted it and the host hasn't confirmed it yet, including after
 * it has been handed over to them.
 */
export const getHostConfirmation = (event: {
  confirmedAtMs?: number;
  postedOnBehalfBy?: string;
  handedOverAtMs?: number;
}): HostConfirmation => {
  const startedWithAnAdmin = Boolean(event.postedOnBehalfBy) || event.handedOverAtMs !== undefined;
  return startedWithAnAdmin && event.confirmedAtMs === undefined ? 'unconfirmed' : 'confirmed';
};

export interface EventOccurrence {
  startsAtMs: number;
  endsAtMs: number;
  /** Set only when the event repeats */
  seriesId?: string;
}

/**
 * The dated occurrences a form produces: one, or one per repeat. Each
 * becomes its own event document.
 */
export const buildEventOccurrences = (
  form: Pick<EventFormData, 'startsAt' | 'endsAt' | 'repeat' | 'repeatUntil'>,
  createSeriesId: () => string
): EventOccurrence[] => {
  const firstStartMs = form.startsAt.getTime();
  const durationMs = form.endsAt.getTime() - firstStartMs;

  if (form.repeat === 'none' || !form.repeatUntil) {
    return [{ startsAtMs: firstStartMs, endsAtMs: firstStartMs + durationMs, seriesId: undefined }];
  }

  const untilMs = endOfDay(form.repeatUntil).getTime();
  const starts =
    form.repeat === 'monthly'
      ? expandMonthlyRecurrence({ firstStartMs, untilMs })
      : expandWeeklyRecurrence({
          firstStartMs,
          untilMs,
          everyWeeks: form.repeat === 'every_two_weeks' ? 2 : 1,
        });

  const seriesId = createSeriesId();
  return starts.map((startsAtMs) => ({ startsAtMs, endsAtMs: startsAtMs + durationMs, seriesId }));
};
