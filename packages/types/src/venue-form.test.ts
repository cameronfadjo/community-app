import { describe, expect, it } from 'vitest';
import {
  buildVenueLead,
  detailsNeedVerifyingAgain,
  getApprovalBlockers,
  getVerificationBlockers,
  guessVenueCategory,
  parseCoordinates,
  parseCsv,
  validateVenueForm,
  type VenueFormData,
} from './venue-form';

const validForm = (overrides: Partial<VenueFormData> = {}): VenueFormData => ({
  name: 'Chez Est',
  description: 'Restaurant, bar, and cabaret.',
  category: 'bar',
  address: '458 Wethersfield Ave',
  city: 'Hartford',
  state: 'CT',
  postalCode: '06114',
  coordinates: '41.7446, -72.6717',
  phone: '',
  email: '',
  website: '',
  accessibility: '',
  notes: '',
  ...overrides,
});

describe('parseCoordinates', () => {
  it('reads a pair copied from a map', () => {
    expect(parseCoordinates('41.3083, -72.9279')).toEqual({
      latitude: 41.3083,
      longitude: -72.9279,
    });
  });

  it('copes with brackets and extra spaces', () => {
    expect(parseCoordinates('  (41.3083,-72.9279) ')).toEqual({
      latitude: 41.3083,
      longitude: -72.9279,
    });
  });

  it('turns away anything that is not a place on earth', () => {
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('952 State St')).toBeNull();
    expect(parseCoordinates('41.3083')).toBeNull();
    expect(parseCoordinates('91, 10')).toBeNull();
    expect(parseCoordinates('10, 181')).toBeNull();
    expect(parseCoordinates('41.3, -72.9, 5')).toBeNull();
  });

  it('turns away the middle of the ocean, which means nothing was entered', () => {
    expect(parseCoordinates('0, 0')).toBeNull();
  });
});

describe('validateVenueForm', () => {
  it('accepts a complete venue', () => {
    expect(validateVenueForm(validForm())).toEqual({});
  });

  it('needs a name, a town, and a state', () => {
    expect(validateVenueForm(validForm({ name: ' ' })).name).toBeDefined();
    expect(validateVenueForm(validForm({ city: '' })).city).toBeDefined();
    expect(validateVenueForm(validForm({ state: '' })).state).toBeDefined();
  });

  it('can be saved without an address or map position, to fill in later', () => {
    expect(validateVenueForm(validForm({ address: '', coordinates: '' }))).toEqual({});
  });

  it('checks a map position when one is given', () => {
    expect(validateVenueForm(validForm({ coordinates: 'somewhere' })).coordinates).toBeDefined();
  });

  it('checks the website and email when given', () => {
    expect(validateVenueForm(validForm({ website: 'chezest.com' })).website).toBeDefined();
    expect(validateVenueForm(validForm({ website: 'https://chezest.com' })).website).toBeUndefined();
    expect(validateVenueForm(validForm({ email: 'hello' })).email).toBeDefined();
  });
});

describe('getApprovalBlockers', () => {
  const position = { latitude: 41.3, longitude: -72.9 };
  const venue = {
    detailsVerified: true,
    location: { address: '952 State St', coordinates: position },
  };

  it('has none for a verified venue with an address and a map position', () => {
    expect(getApprovalBlockers(venue)).toEqual([]);
  });

  it('names what is missing', () => {
    expect(
      getApprovalBlockers({ detailsVerified: false, location: { address: '', coordinates: null } })
    ).toEqual(['a street address', 'a map position', 'its details verified']);
    expect(
      getApprovalBlockers({ ...venue, location: { address: '952 State St', coordinates: null } })
    ).toEqual(['a map position']);
  });

  it('holds back a venue nobody has verified, however complete it looks', () => {
    expect(getApprovalBlockers({ ...venue, detailsVerified: false })).toEqual([
      'its details verified',
    ]);
    expect(getApprovalBlockers({ location: venue.location })).toEqual(['its details verified']);
  });
});

describe('getVerificationBlockers', () => {
  it('needs an address and a position to check', () => {
    expect(getVerificationBlockers({ location: { address: '', coordinates: null } })).toEqual([
      'a street address',
      'a map position',
    ]);
    expect(
      getVerificationBlockers({
        location: { address: '952 State St', coordinates: { latitude: 41.3, longitude: -72.9 } },
      })
    ).toEqual([]);
  });
});

describe('detailsNeedVerifyingAgain', () => {
  const stored = {
    name: 'Trans Haven',
    location: {
      address: '952 State St',
      city: 'New Haven',
      state: 'CT',
      postalCode: '06511',
      coordinates: { latitude: 41.3154, longitude: -72.9077 },
    },
  };
  const form = validForm({
    name: 'Trans Haven',
    address: '952 State St',
    city: 'New Haven',
    state: 'CT',
    postalCode: '06511',
    coordinates: '41.3154, -72.9077',
  });

  it('keeps the verification when nothing that was checked has changed', () => {
    expect(detailsNeedVerifyingAgain(stored, form)).toBe(false);
    expect(detailsNeedVerifyingAgain(stored, { ...form, notes: 'Spoke to Sam', phone: '555' })).toBe(
      false
    );
    expect(detailsNeedVerifyingAgain(stored, { ...form, address: ' 952 State St ' })).toBe(false);
  });

  it('asks again when the name, address, or position changes', () => {
    expect(detailsNeedVerifyingAgain(stored, { ...form, name: 'Trans Haven CT' })).toBe(true);
    expect(detailsNeedVerifyingAgain(stored, { ...form, address: '950 State St' })).toBe(true);
    expect(detailsNeedVerifyingAgain(stored, { ...form, city: 'Hamden' })).toBe(true);
    expect(detailsNeedVerifyingAgain(stored, { ...form, coordinates: '41.3155, -72.9077' })).toBe(
      true
    );
    expect(detailsNeedVerifyingAgain(stored, { ...form, coordinates: '' })).toBe(true);
  });
});

describe('guessVenueCategory', () => {
  it('reads the kind of place from the directory wording', () => {
    expect(guessVenueCategory('Bar / cabaret')).toBe('bar');
    expect(guessVenueCategory('Nightclub')).toBe('club');
    expect(guessVenueCategory('Cocktail lounge / restaurant')).toBe('bar');
    expect(guessVenueCategory('Brewery')).toBe('bar');
    expect(guessVenueCategory('Restaurant')).toBe('restaurant');
    expect(guessVenueCategory('Board game cafe')).toBe('cafe');
    expect(guessVenueCategory('Bakery')).toBe('cafe');
    expect(guessVenueCategory('Community center')).toBe('community_space');
    expect(guessVenueCategory('Library')).toBe('community_space');
    expect(guessVenueCategory('Bookshop / reading room')).toBe('shop');
    expect(guessVenueCategory('Game store')).toBe('shop');
    expect(guessVenueCategory('Performing arts center')).toBe('theater');
    expect(guessVenueCategory('Cinema')).toBe('theater');
    expect(guessVenueCategory('Climbing gym')).toBe('fitness');
    expect(guessVenueCategory('Farm')).toBe('outdoors');
  });

  it('falls back to other', () => {
    expect(guessVenueCategory('Venue')).toBe('other');
    expect(guessVenueCategory('')).toBe('other');
  });
});

describe('parseCsv', () => {
  it('reads rows by their headings', () => {
    expect(parseCsv('name,town\nChez Est,Hartford\nTroupe 429,Norwalk\n')).toEqual([
      { name: 'Chez Est', town: 'Hartford' },
      { name: 'Troupe 429', town: 'Norwalk' },
    ]);
  });

  it('keeps commas, quotes, and line breaks inside quoted text', () => {
    const rows = parseCsv('name,notes\r\n"Bar, the","Says ""hello""\nto all"\r\n');
    expect(rows).toEqual([{ name: 'Bar, the', notes: 'Says "hello"\nto all' }]);
  });

  it('skips empty lines and fills missing cells', () => {
    expect(parseCsv('name,town\n\nChez Est\n')).toEqual([{ name: 'Chez Est', town: '' }]);
  });
});

describe('buildVenueLead', () => {
  const row = {
    name: 'Trans Haven',
    town: 'New Haven (also Hartford, Middletown)',
    type: 'Community space',
    hosts_events: 'Yes',
    notes: 'Hosts monthly hangouts.',
    accessibility: 'Step-free entrance',
    street_address: '952 State St',
    verified: 'No',
  };

  it('builds a venue waiting for its details', () => {
    expect(buildVenueLead(row, { state: 'CT', source: 'LGBTQ+ CT Resources' })).toEqual({
      id: 'trans-haven-new-haven',
      name: 'Trans Haven',
      description: '',
      category: 'community_space',
      location: {
        address: '952 State St',
        city: 'New Haven',
        state: 'CT',
        country: 'USA',
        postalCode: '',
        coordinates: null,
      },
      contact: {},
      images: [],
      featured: false,
      accessibility: 'Step-free entrance',
      notes: 'Hosts monthly hangouts. Listed towns: New Haven (also Hartford, Middletown).',
      source: 'LGBTQ+ CT Resources',
      detailsVerified: false,
      moderationStatus: 'pending',
    });
  });

  it('takes an address, position, and website that were looked up, still unverified', () => {
    const lead = buildVenueLead(
      {
        ...row,
        town: 'New Haven',
        postal_code: '06511',
        latitude: '41.3154',
        longitude: '-72.9077',
        website: 'https://example.org',
        address_source: 'https://example.org/contact',
        lookup_note: 'Entrance is on the side street.',
      },
      { state: 'CT', source: 'x' }
    );
    expect(lead?.location.postalCode).toBe('06511');
    expect(lead?.location.coordinates).toEqual({ latitude: 41.3154, longitude: -72.9077 });
    expect(lead?.contact).toEqual({ website: 'https://example.org' });
    expect(lead?.detailsVerified).toBe(false);
    expect(lead?.notes).toBe(
      'Hosts monthly hangouts. Address looked up at https://example.org/contact and not yet verified. Entrance is on the side street.'
    );
  });

  it('ignores a position that is not a real one', () => {
    const lead = buildVenueLead(
      { ...row, latitude: '', longitude: '-72.9' },
      { state: 'CT', source: 'x' }
    );
    expect(lead?.location.coordinates).toBeNull();
  });

  it('makes an id that is safe in a web address', () => {
    const lead = buildVenueLead(
      { ...row, name: "Partners Bar & Nightclub / Café", town: 'New Haven' },
      { state: 'CT', source: 'x' }
    );
    expect(lead.id).toBe('partners-bar-nightclub-cafe-new-haven');
    expect(lead.notes).toBe('Hosts monthly hangouts.');
  });

  it('has no venue for a row without a name or town', () => {
    expect(buildVenueLead({ ...row, name: '' }, { state: 'CT', source: 'x' })).toBeNull();
    expect(buildVenueLead({ ...row, town: ' ' }, { state: 'CT', source: 'x' })).toBeNull();
  });
});
