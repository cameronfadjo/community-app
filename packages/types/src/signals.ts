/**
 * Anonymous counts of what people do with an event, for its host to see.
 *
 * A count is a number and nothing more. It carries no account, no phone,
 * and no location. Times are kept to the day and the hour. Each phone
 * counts once per event per day, remembered on the phone itself.
 */

export type SignalKind = 'view' | 'directions' | 'perkView';

/** The field each kind adds to */
export const SIGNAL_FIELDS: Record<SignalKind, 'views' | 'directions' | 'perkViews'> = {
  view: 'views',
  directions: 'directions',
  perkView: 'perkViews',
};

export const HOUR_FIELDS = Array.from(
  { length: 24 },
  (_, hour) => `h${String(hour).padStart(2, '0')}`
);

/**
 * One day of counts for one event, stored in
 * `eventSignals/{eventId}/days/{day}`. Hours are the hour of the day the
 * event was viewed, in the viewer's own time.
 */
export interface SignalDay {
  eventId: string;
  /** YYYY-MM-DD */
  day: string;
  views?: number;
  directions?: number;
  perkViews?: number;
  /** Views in each hour, in fields h00 to h23 */
  [hourField: `h${string}`]: number | undefined;
}

const pad = (value: number): string => String(value).padStart(2, '0');

export const toDayKey = (when: Date): string =>
  `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;

export const toHourField = (when: Date): string => `h${pad(when.getHours())}`;

/**
 * The fields one action adds one to. The app sends exactly these, and the
 * security rules refuse anything else.
 */
export const getSignalFields = (kind: SignalKind, when: Date): string[] =>
  kind === 'view' ? [SIGNAL_FIELDS.view, toHourField(when)] : [SIGNAL_FIELDS[kind]];

/** What this phone has already counted today. Kept on the phone only. */
export interface CountedToday {
  day: string;
  counted: string[];
}

const SAMPLE_PREFIX = 'sample_';

const keyFor = (eventId: string, kind: SignalKind): string => `${eventId}:${kind}`;

export const shouldCount = (
  seen: CountedToday,
  eventId: string,
  kind: SignalKind,
  today: string
): boolean => {
  if (eventId.startsWith(SAMPLE_PREFIX)) {
    return false;
  }
  return seen.day !== today || !seen.counted.includes(keyFor(eventId, kind));
};

/** Yesterday's list is dropped, so the phone never builds up a history */
export const markCounted = (
  seen: CountedToday,
  eventId: string,
  kind: SignalKind,
  today: string
): CountedToday => ({
  day: today,
  counted: [...(seen.day === today ? seen.counted : []), keyFor(eventId, kind)],
});

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;

export interface SignalSummary {
  views: number;
  directions: number;
  perkViews: number;
  /** Oldest first. Only days with at least one view. */
  byDay: Array<{ day: string; views: number }>;
  /** Views in each hour of the day, 0 to 23 */
  byHour: number[];
}

export const summarizeSignals = (days: SignalDay[]): SignalSummary => {
  const summary: SignalSummary = {
    views: 0,
    directions: 0,
    perkViews: 0,
    byDay: [],
    byHour: HOUR_FIELDS.map(() => 0),
  };
  const viewsByDay = new Map<string, number>();

  for (const item of days) {
    const views = count(item.views);
    summary.views += views;
    summary.directions += count(item.directions);
    summary.perkViews += count(item.perkViews);
    if (views > 0) {
      viewsByDay.set(item.day, (viewsByDay.get(item.day) ?? 0) + views);
    }
    HOUR_FIELDS.forEach((field, hour) => {
      summary.byHour[hour] = (summary.byHour[hour] ?? 0) + count(item[field as `h${string}`]);
    });
  }

  summary.byDay = [...viewsByDay.entries()]
    .map(([day, views]) => ({ day, views }))
    .sort((a, b) => a.day.localeCompare(b.day));
  return summary;
};

/** Fewer views than this and "when" is held back, so no one person stands out */
export const MIN_FOR_BREAKDOWN = 5;

export const canShowBreakdown = (views: number): boolean => views >= MIN_FOR_BREAKDOWN;

export interface EventTotals {
  views: number;
  directions: number;
  perkViews?: number;
  perkUnlocked?: number;
  perkRedeemed?: number;
  hasPerk?: boolean;
}

export interface FunnelStep {
  step: string;
  count: number;
}

/** From seeing the event to using its perk, in the order it happens */
export const buildFunnel = (totals: EventTotals): FunnelStep[] => {
  const steps: FunnelStep[] = [
    { step: 'Viewed the event', count: totals.views },
    { step: 'Asked for directions', count: totals.directions },
  ];
  if (totals.hasPerk === false) {
    return steps;
  }
  return [
    ...steps,
    { step: 'Went for the perk', count: totals.perkViews ?? 0 },
    { step: 'Unlocked the perk at the door', count: totals.perkUnlocked ?? 0 },
    { step: 'Used the perk', count: totals.perkRedeemed ?? 0 },
  ];
};

export interface EventInsight {
  venueId: string;
  venueName: string;
  views: number;
  directions: number;
  perkViews: number;
  perkUnlocked: number;
  perkRedeemed: number;
}

export interface VenueInsight extends EventInsight {
  /** How many of the host's events at this venue are counted */
  events: number;
}

export const rollUpByVenue = (events: EventInsight[]): VenueInsight[] => {
  const venues = new Map<string, VenueInsight>();

  for (const event of events) {
    const venue = venues.get(event.venueId);
    if (!venue) {
      venues.set(event.venueId, { ...event, events: 1 });
      continue;
    }
    venue.events += 1;
    venue.views += event.views;
    venue.directions += event.directions;
    venue.perkViews += event.perkViews;
    venue.perkUnlocked += event.perkUnlocked;
    venue.perkRedeemed += event.perkRedeemed;
  }

  return [...venues.values()].sort((a, b) => b.views - a.views);
};

/** Perk records say who was where, so they are kept only this long after the event */
export const PERK_RECORD_KEPT_DAYS = 30;

export const getPerkRecordDeleteAtMs = (eventEndsAtMs: number): number =>
  eventEndsAtMs + PERK_RECORD_KEPT_DAYS * 24 * 60 * 60 * 1000;
