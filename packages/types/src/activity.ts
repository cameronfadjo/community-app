import type { Timestamp } from 'firebase/firestore';

/**
 * The six rainbow-flag colors. Every activity is assigned one, and the apps
 * map each name to a pale tint (tile fill) and a darker shade (icon).
 */
export const ACTIVITY_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'] as const;

export type ActivityColor = (typeof ACTIVITY_COLORS)[number];

/**
 * Something a person can go and do: dancing, a drag show, a book club.
 *
 * Activities are data, stored in the `activities` collection and managed by
 * admins, so the list can grow without an app release.
 */
export interface Activity {
  /** URL-safe slug, also the document ID. e.g. `drag-shows` */
  id: string;
  /** Plural display name. e.g. "Drag shows" */
  label: string;
  /** Key into the app's icon set; apps fall back to a generic icon if unknown */
  icon: string;
  color: ActivityColor;
  /** Lower numbers are listed first when nothing else ranks them */
  sortOrder: number;
  /** Inactive activities are hidden from consumers and from the posting form */
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivitySeed = Omit<Activity, 'createdAt' | 'updatedAt'>;

// Letters are not all the same width. These are rough, measured against
// names that do and don't fit: "workshops" fits and "performance" doesn't.
const NARROW_LETTERS = 'fijlrtI';
const WIDE_LETTERS = 'mwMW';
const NARROW_WIDTH = 0.6;
const WIDE_WIDTH = 1.5;

/** A word wider than this many average letters doesn't fit across a tile at full size */
export const TILE_WORD_LIMIT = 9.6;

const estimateWidth = (word: string): number =>
  [...word].reduce((width, letter) => {
    if (WIDE_LETTERS.includes(letter)) return width + WIDE_WIDTH;
    if (NARROW_LETTERS.includes(letter)) return width + NARROW_WIDTH;
    return width + 1;
  }, 0);

/**
 * True when a name has a word too wide for a tile, so the tile can use
 * smaller type and show the whole name. Names are data, so any length can
 * turn up.
 */
export const hasLongWord = (label: string): boolean =>
  label.split(/[\s-]+/).some((word) => estimateWidth(word) > TILE_WORD_LIMIT);

/** Colors repeat once there are more than six activities. */
export const activityColorForIndex = (index: number): ActivityColor =>
  ACTIVITY_COLORS[index % ACTIVITY_COLORS.length] as ActivityColor;

const seed = (entries: Array<[id: string, label: string, icon: string]>): ActivitySeed[] =>
  entries.map(([id, label, icon], index) => ({
    id,
    label,
    icon,
    color: activityColorForIndex(index),
    sortOrder: (index + 1) * 10,
    active: true,
  }));

/**
 * Starting set written by the seed script. Admins add to it from there.
 *
 * Every activity is somewhere to go and something to do. Services such as
 * support groups are left out. Pride groups and community centers appear as
 * the hosts of events under these activities, not as a directory.
 */
export const DEFAULT_ACTIVITIES: ActivitySeed[] = seed([
  ['dancing', 'Dancing', 'music'],
  ['drag-shows', 'Drag shows', 'sparkles'],
  ['bear-nights', 'Bear nights', 'paw'],
  ['book-clubs', 'Book clubs', 'book'],
  ['karaoke', 'Karaoke', 'mic'],
  ['trivia', 'Trivia', 'help-circle'],
  ['live-music', 'Live music', 'guitar'],
  ['comedy', 'Comedy', 'smile'],
  ['game-nights', 'Game nights', 'dice'],
  ['happy-hours', 'Happy hours', 'glass'],
  ['brunch', 'Brunch', 'coffee'],
  ['open-mics', 'Open mics', 'megaphone'],
  ['film-nights', 'Film nights', 'film'],
  ['cabaret-and-burlesque', 'Cabaret and burlesque', 'star'],
  ['sapphic-nights', 'Sapphic nights', 'heart'],
  ['trans-and-nonbinary-meetups', 'Trans and nonbinary meetups', 'users'],
  ['leather-nights', 'Leather nights', 'shield'],
  ['sober-socials', 'Sober socials', 'cup'],
  ['singles-mixers', 'Singles mixers', 'message-heart'],
  ['arts-and-crafts', 'Arts and crafts', 'palette'],
  ['classes-and-workshops', 'Classes and workshops', 'pencil'],
  ['sports-and-fitness', 'Sports and fitness', 'activity'],
  ['outdoors', 'Outdoors', 'tree'],
  ['supper-clubs', 'Supper clubs', 'utensils'],
  ['community-hangouts', 'Hangouts', 'sofa'],
  ['pride-events', 'Pride events', 'flag'],
  ['meetups-and-mixers', 'Meetups and mixers', 'handshake'],
  ['tabletop-and-role-playing', 'Tabletop and role-playing', 'swords'],
  ['watch-parties', 'Watch parties', 'tv'],
  ['theater-and-performance', 'Theater and performance', 'masks'],
  ['markets-and-fairs', 'Markets and fairs', 'store'],
]);

/** Activities the seed script switches off if they exist. They are not going out. */
export const RETIRED_ACTIVITY_IDS = ['support-groups'];
