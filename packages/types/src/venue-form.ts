/**
 * Rules for adding venues, by hand in the admin dashboard or from a list.
 * Shared so the form, the import script, and the approval check agree.
 */

import type { ModerationStatus } from './common';
import type { VenueCategory } from './venue';
import { validateSocialLinks, type SocialLinkErrors, type SocialLinks } from './venue-social';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Reads a map position typed or pasted as "41.3083, -72.9279", which is how
 * map apps copy it.
 */
export const parseCoordinates = (input: string): Coordinates | null => {
  const match = /^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  // 0, 0 is open ocean. It shows up when a position was never filled in.
  if (latitude === 0 && longitude === 0) {
    return null;
  }

  return { latitude, longitude };
};

/** What the admin dashboard form collects. Everything is text as typed. */
export interface VenueFormData {
  name: string;
  description: string;
  category: VenueCategory;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  /** "latitude, longitude" */
  coordinates: string;
  phone: string;
  email: string;
  website: string;
  /** Handles or links, as typed */
  social: SocialLinks;
  accessibility: string;
  /** For admins only. Never shown in the app. */
  notes: string;
}

export type VenueFormErrors = Partial<Record<Exclude<keyof VenueFormData, 'social'>, string>> & {
  social?: SocialLinkErrors;
};

export const MAX_VENUE_NAME_LENGTH = 80;

const isWebAddress = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Returns a message per invalid field. An empty object means it can be
 * saved. A venue can be saved without an address or map position and
 * finished later, but it cannot be approved until it has both.
 */
export const validateVenueForm = (form: VenueFormData): VenueFormErrors => {
  const errors: VenueFormErrors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = 'Give the venue a name.';
  } else if (name.length > MAX_VENUE_NAME_LENGTH) {
    errors.name = `Keep the name under ${MAX_VENUE_NAME_LENGTH} characters.`;
  }

  if (!form.city.trim()) {
    errors.city = 'Enter the town or city.';
  }
  if (!form.state.trim()) {
    errors.state = 'Enter the state.';
  }

  if (form.coordinates.trim() && !parseCoordinates(form.coordinates)) {
    errors.coordinates = 'Enter the position as latitude, longitude. For example: 41.3083, -72.9279';
  }

  if (form.website.trim() && !isWebAddress(form.website.trim())) {
    errors.website = 'Enter a full web address starting with https://';
  }
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "That doesn't look like an email address.";
  }

  const social = validateSocialLinks(form.social).errors;
  if (Object.keys(social).length > 0) {
    errors.social = social;
  }

  return errors;
};

interface LocationCheck {
  location: { address: string; coordinates: unknown | null };
}

/**
 * What a venue still needs before its details can be verified: there has
 * to be an address and a position to check.
 */
export const getVerificationBlockers = (venue: LocationCheck): string[] => {
  const blockers: string[] = [];
  if (!venue.location.address?.trim()) {
    blockers.push('a street address');
  }
  if (!venue.location.coordinates) {
    blockers.push('a map position');
  }
  return blockers;
};

/**
 * What a venue still needs before it can be approved. Events copy the
 * venue's position, and perks unlock by it, so it has to be there and an
 * admin has to have checked it.
 */
export const getApprovalBlockers = (
  venue: LocationCheck & { detailsVerified?: boolean }
): string[] => {
  const blockers = getVerificationBlockers(venue);
  if (!venue.detailsVerified) {
    blockers.push('its details verified');
  }
  return blockers;
};

/**
 * True when events can be posted at the venue: it is approved, an admin has
 * verified it, and it has an address and a map position.
 *
 * Approved alone is not enough. Venues approved before verifying existed
 * were never checked.
 */
export const isOpenForEvents = (
  venue: LocationCheck & { moderationStatus: ModerationStatus; detailsVerified?: boolean }
): boolean => venue.moderationStatus === 'approved' && getApprovalBlockers(venue).length === 0;

interface StoredDetails {
  name: string;
  location: {
    address: string;
    city: string;
    state?: string;
    postalCode?: string;
    coordinates: Coordinates | null;
  };
}

/**
 * True when an edit changes something that was verified: the name, the
 * address, or the map position. The venue then has to be verified again.
 */
export const detailsNeedVerifyingAgain = (stored: StoredDetails, form: VenueFormData): boolean => {
  const same = (before: string | undefined, after: string) => (before ?? '').trim() === after.trim();
  const position = parseCoordinates(form.coordinates);
  const before = stored.location.coordinates;
  const samePosition =
    before === null || position === null
      ? before === position
      : before.latitude === position.latitude && before.longitude === position.longitude;

  return !(
    same(stored.name, form.name) &&
    same(stored.location.address, form.address) &&
    same(stored.location.city, form.city) &&
    same(stored.location.state, form.state) &&
    same(stored.location.postalCode, form.postalCode) &&
    samePosition
  );
};

// First match wins, so "Cocktail lounge / restaurant" is a bar and
// "Performing arts center" is a theater
const CATEGORY_WORDS: Array<[VenueCategory, RegExp]> = [
  ['club', /club/],
  ['bar', /\bbar\b|lounge|brewery|pub\b/],
  ['theater', /theat|cinema|arts|playhouse/],
  ['fitness', /gym|fitness|climbing|yoga/],
  ['restaurant', /restaurant|eatery|grill|diner/],
  ['cafe', /caf[eé]|coffee|bakery|tea/],
  ['shop', /shop|store/],
  ['community_space', /community|cent(er|re)|library|meeting|church/],
  ['outdoors', /farm|park|garden|trail/],
];

/** Best guess at the kind of place from free text such as "Bar / cabaret" */
export const guessVenueCategory = (text: string): VenueCategory => {
  const words = text.toLowerCase();
  return CATEGORY_WORDS.find(([, pattern]) => pattern.test(words))?.[0] ?? 'other';
};

/** Reads CSV text into one object per row, keyed by the headings in the first row */
export const parseCsv = (text: string): Array<Record<string, string>> => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headings, ...records] = rows;
  if (!headings) {
    return [];
  }

  return records
    .filter((cells) => cells.some((value) => value.trim() !== ''))
    .map((cells) =>
      Object.fromEntries(headings.map((heading, index) => [heading.trim(), cells[index] ?? '']))
    );
};

/** A venue from a list, waiting for its address and map position to be confirmed */
export interface VenueLeadSeed {
  id: string;
  name: string;
  description: string;
  category: VenueCategory;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates: Coordinates | null;
  };
  contact: { website?: string; social?: SocialLinks };
  images: string[];
  featured: boolean;
  accessibility: string;
  notes: string;
  source: string;
  /** Always false: an admin verifies the details, never the list */
  detailsVerified: false;
  moderationStatus: ModerationStatus;
}

const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export interface VenueLeadOptions {
  /** The list covers one state */
  state: string;
  /** Where the list came from, kept with each venue */
  source: string;
}

/**
 * Turns one row of a venue list into a venue that is waiting for approval.
 * Expects the columns of docs/launch-connecticut/venues.csv. Anything that
 * was looked up comes in unverified. Returns null for a row without a name
 * or a town.
 */
export const buildVenueLead = (
  row: Record<string, string>,
  { state, source }: VenueLeadOptions
): VenueLeadSeed | null => {
  const name = (row.name ?? '').trim();
  const town = (row.town ?? '').trim();
  if (!name || !town) {
    return null;
  }

  // "New Haven (also Hartford, Middletown)": the first town is where it is
  const city = town.split('(')[0]!.split('/')[0]!.trim();
  const addressSource = (row.address_source ?? '').trim();
  const notes = [
    (row.notes ?? '').trim(),
    city === town ? '' : `Listed towns: ${town}.`,
    addressSource ? `Address looked up at ${addressSource} and not yet verified.` : '',
    (row.lookup_note ?? '').trim(),
  ]
    .filter(Boolean)
    .join(' ');

  const website = (row.website ?? '').trim();
  // Columns named after a platform, such as `instagram`. Bad ones are skipped.
  const { links } = validateSocialLinks({
    instagram: row.instagram,
    facebook: row.facebook,
    tiktok: row.tiktok,
    x: row.x,
    youtube: row.youtube,
  });
  const social = Object.keys(links).length > 0 ? { social: links } : {};

  return {
    id: slugify(`${name} ${city}`),
    name,
    description: '',
    category: guessVenueCategory(row.type ?? ''),
    location: {
      address: (row.street_address ?? '').trim(),
      city,
      state,
      country: 'USA',
      postalCode: (row.postal_code ?? '').trim(),
      coordinates: parseCoordinates(`${row.latitude ?? ''}, ${row.longitude ?? ''}`),
    },
    contact: { ...(website ? { website } : {}), ...social },
    images: [],
    featured: false,
    accessibility: (row.accessibility ?? '').trim(),
    notes,
    source,
    detailsVerified: false,
    moderationStatus: 'pending',
  };
};
