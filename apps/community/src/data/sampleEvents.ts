import { GeoPoint, Timestamp } from 'firebase/firestore';
import { Activity, DEFAULT_ACTIVITIES, EventListing, EventTags } from '../types';

// Sample data for development, shown only when Firestore has no events.
// Times are relative to now so there is always something on: today, later
// in the week, and later in the month.

const MINUTE = 60 * 1000;
const DAY_MINUTES = 24 * 60;

const tags = (overrides: Partial<EventTags> = {}): EventTags => ({
  goodForSolo: false,
  firstTimersWelcome: false,
  alcoholFree: false,
  stepFreeEntry: false,
  minimumAge: 21,
  ...overrides,
});

const VENUES = {
  stud: {
    venueId: 'sample_4',
    venueName: 'The Stud',
    location: {
      coordinates: new GeoPoint(37.7749, -122.4194),
      address: '399 9th St',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94103',
    },
  },
  twinPeaks: {
    venueId: 'sample_2',
    venueName: 'Twin Peaks Bar',
    location: {
      coordinates: new GeoPoint(37.7622, -122.4357),
      address: '401 Castro St',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94114',
    },
  },
  frances: {
    venueId: 'sample_5',
    venueName: 'Frances',
    location: {
      coordinates: new GeoPoint(37.7615, -122.4359),
      address: '3870 17th St',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94114',
    },
  },
};

interface SampleEventInput {
  id: string;
  title: string;
  description: string;
  activityIds: string[];
  venue: keyof typeof VENUES;
  startsInMinutes: number;
  durationMinutes: number;
  coverCents: number;
  tags: EventTags;
  audience: string[];
  perkLabel?: string;
  busyLevel?: EventListing['busyLevel'];
  organizerName?: string;
  /** Posted for the host, who hasn't confirmed it yet */
  unconfirmed?: boolean;
}

const build = (input: SampleEventInput, nowMs: number): EventListing => {
  const startsAt = nowMs + input.startsInMinutes * MINUTE;
  const stamp = Timestamp.fromMillis(nowMs);

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    activityIds: input.activityIds,
    ...VENUES[input.venue],
    organizerId: 'sample_organizer',
    startsAt: Timestamp.fromMillis(startsAt),
    endsAt: Timestamp.fromMillis(startsAt + input.durationMinutes * MINUTE),
    coverCents: input.coverCents,
    images: [],
    tags: input.tags,
    audience: input.audience,
    perkLabel: input.perkLabel,
    busyLevel: input.busyLevel,
    status: 'scheduled',
    ...(input.organizerName ? { organizerName: input.organizerName } : {}),
    ...(input.unconfirmed ? { postedOnBehalfBy: 'sample_admin' } : { confirmedAt: stamp }),
    createdAt: stamp,
    updatedAt: stamp,
  };
};

export const buildSampleEvents = (nowMs: number = Date.now()): EventListing[] =>
  [
    build(
      {
        id: 'sample_event_drag_show',
        title: 'Late drag show',
        description:
          'A one-hour show in the main room, then a DJ and dancing until close. Relaxed dress, mixed crowd.',
        activityIds: ['drag-shows', 'dancing'],
        venue: 'stud',
        startsInMinutes: 18,
        durationMinutes: 240,
        coverCents: 1000,
        tags: tags({ goodForSolo: true, firstTimersWelcome: true, stepFreeEntry: true }),
        audience: ['Everyone welcome'],
        perkLabel: 'Free drink',
        busyLevel: 'filling_up',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_bear_night',
        title: 'Bear night',
        description: 'A friendly, low-key night at the bar. Come as you are.',
        activityIds: ['bear-nights'],
        venue: 'twinPeaks',
        startsInMinutes: -60,
        durationMinutes: 300,
        coverCents: 0,
        tags: tags({ goodForSolo: true }),
        audience: ['Bears and friends'],
        perkLabel: '2-for-1 cocktails',
        busyLevel: 'packed',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_drag_bingo',
        title: 'Drag bingo',
        description: 'Bingo cards, a drag host, and prizes. Easy to join a table on your own.',
        activityIds: ['drag-shows', 'game-nights'],
        venue: 'twinPeaks',
        startsInMinutes: -45,
        durationMinutes: 150,
        coverCents: 0,
        tags: tags({ goodForSolo: true, firstTimersWelcome: true }),
        audience: ['Everyone welcome'],
        busyLevel: 'packed',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_book_club',
        title: 'Queer book club',
        description: 'This month: short stories. You do not need to have finished the book.',
        activityIds: ['book-clubs', 'sober-socials'],
        venue: 'frances',
        startsInMinutes: 50,
        durationMinutes: 90,
        coverCents: 0,
        tags: tags({
          goodForSolo: true,
          firstTimersWelcome: true,
          alcoholFree: true,
          stepFreeEntry: true,
          minimumAge: 18,
        }),
        audience: ['Everyone welcome'],
        busyLevel: 'quiet',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_karaoke',
        title: 'Karaoke night',
        description: 'Sign up at the bar. The crowd cheers for everyone.',
        activityIds: ['karaoke'],
        venue: 'stud',
        startsInMinutes: 120,
        durationMinutes: 180,
        coverCents: 500,
        tags: tags({ firstTimersWelcome: true, stepFreeEntry: true }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_late_dance',
        title: 'Late night dance floor',
        description: 'House and disco until close.',
        activityIds: ['dancing'],
        venue: 'stud',
        startsInMinutes: 100,
        durationMinutes: 210,
        coverCents: 1500,
        tags: tags({ stepFreeEntry: true }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_trivia',
        title: 'Pub trivia',
        description: 'Teams of up to six. Turn up alone and the host will find you a team.',
        activityIds: ['trivia'],
        venue: 'twinPeaks',
        startsInMinutes: DAY_MINUTES + 30,
        durationMinutes: 120,
        coverCents: 0,
        tags: tags({ goodForSolo: true, firstTimersWelcome: true }),
        audience: ['Everyone welcome'],
        perkLabel: 'Free appetizer',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_hangout',
        title: 'Third Saturday hangout',
        description: 'Coffee, board games, and easy conversation.',
        organizerName: 'The community center',
        unconfirmed: true,
        activityIds: ['community-hangouts', 'game-nights'],
        venue: 'frances',
        startsInMinutes: 3 * DAY_MINUTES,
        durationMinutes: 120,
        coverCents: 0,
        tags: tags({
          goodForSolo: true,
          firstTimersWelcome: true,
          alcoholFree: true,
          stepFreeEntry: true,
          minimumAge: 18,
        }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_watch_party',
        title: 'Drag Race watch party',
        description: 'The episode on the big screen, with a live show in the breaks.',
        activityIds: ['watch-parties', 'drag-shows'],
        venue: 'stud',
        startsInMinutes: 5 * DAY_MINUTES,
        durationMinutes: 180,
        coverCents: 0,
        tags: tags({ firstTimersWelcome: true, stepFreeEntry: true }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_open_mic',
        title: 'Open mic night',
        description: 'Poems, songs, and stories. Sign up at the door, or just listen.',
        activityIds: ['open-mics', 'live-music'],
        venue: 'frances',
        startsInMinutes: 9 * DAY_MINUTES + 120,
        durationMinutes: 150,
        coverCents: 0,
        tags: tags({ goodForSolo: true, firstTimersWelcome: true, minimumAge: 18 }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_tea_dance',
        title: 'Sunday tea dance',
        description: 'Afternoon dancing with a disco and house set. Finishes early.',
        activityIds: ['dancing'],
        venue: 'stud',
        startsInMinutes: 16 * DAY_MINUTES,
        durationMinutes: 240,
        coverCents: 800,
        tags: tags({ goodForSolo: true, stepFreeEntry: true }),
        audience: ['Everyone welcome'],
        perkLabel: 'Free soft drink',
      },
      nowMs
    ),
    build(
      {
        id: 'sample_event_makers_market',
        title: 'Queer makers market',
        description: 'Stalls from local artists and makers, with coffee and cake.',
        activityIds: ['markets-and-fairs', 'arts-and-crafts'],
        venue: 'twinPeaks',
        startsInMinutes: 24 * DAY_MINUTES - 180,
        durationMinutes: 300,
        coverCents: 0,
        tags: tags({
          goodForSolo: true,
          firstTimersWelcome: true,
          alcoholFree: true,
          stepFreeEntry: true,
          minimumAge: 18,
        }),
        audience: ['Everyone welcome'],
      },
      nowMs
    ),
  ].sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());

export const buildSampleActivities = (): Activity[] => {
  const stamp = Timestamp.now();
  return DEFAULT_ACTIVITIES.map((activity) => ({ ...activity, createdAt: stamp, updatedAt: stamp }));
};
