import { describe, expect, it } from 'vitest';
import {
  MAX_CLAIM_NOTE_LENGTH,
  getClaimId,
  getClaimKey,
  groupClaimableEvents,
  validateClaim,
} from './event-claim';
import { getHostConfirmation } from './event-form';

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'event_1',
  title: 'Nonbinary Hangout',
  venueName: 'Trans Haven',
  organizerName: 'Trans Haven',
  startsAtMs: 5000,
  status: 'scheduled' as const,
  postedOnBehalfBy: 'admin_1',
  ...overrides,
});

describe('getClaimKey', () => {
  it('is the series for a repeating event, so every date is claimed together', () => {
    expect(getClaimKey({ id: 'event_1', seriesId: 'series_1' })).toBe('series_1');
  });

  it('is the event itself when it does not repeat', () => {
    expect(getClaimKey({ id: 'event_1' })).toBe('event_1');
  });
});

describe('getClaimId', () => {
  it('gives each host one claim per event or series', () => {
    expect(getClaimId('series_1', 'partner_1')).toBe('series_1_partner_1');
  });
});

describe('groupClaimableEvents', () => {
  const now = 1000;

  it('lists an event an admin posted for a host', () => {
    expect(groupClaimableEvents([event()], now)).toEqual([
      {
        claimKey: 'event_1',
        title: 'Nonbinary Hangout',
        organizerName: 'Trans Haven',
        venueName: 'Trans Haven',
        nextStartsAtMs: 5000,
        dates: 1,
      },
    ]);
  });

  it('shows a series once, with its next date and how many are left', () => {
    const groups = groupClaimableEvents(
      [
        event({ id: 'a', seriesId: 'series_1', startsAtMs: 9000 }),
        event({ id: 'b', seriesId: 'series_1', startsAtMs: 3000 }),
        event({ id: 'c', seriesId: 'series_1', startsAtMs: 6000 }),
      ],
      now
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ claimKey: 'series_1', nextStartsAtMs: 3000, dates: 3 });
  });

  it('leaves out events that belong to their host already', () => {
    expect(groupClaimableEvents([event({ postedOnBehalfBy: undefined })], now)).toEqual([]);
  });

  it('leaves out events that are over or were taken down', () => {
    expect(groupClaimableEvents([event({ startsAtMs: 500 })], now)).toEqual([]);
    expect(groupClaimableEvents([event({ status: 'cancelled' })], now)).toEqual([]);
  });

  it('puts the soonest first', () => {
    const groups = groupClaimableEvents(
      [event({ id: 'late', startsAtMs: 9000 }), event({ id: 'soon', startsAtMs: 2000 })],
      now
    );
    expect(groups.map((group) => group.claimKey)).toEqual(['soon', 'late']);
  });
});

describe('validateClaim', () => {
  const valid = { isHost: true, note: 'I organize this for Trans Haven.' };

  it('accepts a claim from someone who says they run the event', () => {
    expect(validateClaim(valid)).toEqual({});
  });

  it('needs them to say they run it', () => {
    expect(validateClaim({ ...valid, isHost: false }).isHost).toBeDefined();
  });

  it('needs a note so an admin can check the claim', () => {
    expect(validateClaim({ ...valid, note: '  ' }).note).toBeDefined();
    expect(validateClaim({ ...valid, note: 'x'.repeat(MAX_CLAIM_NOTE_LENGTH + 1) }).note).toBeDefined();
  });
});

describe('getHostConfirmation after a hand-over', () => {
  it('stays unconfirmed until the host confirms the details', () => {
    expect(getHostConfirmation({ handedOverAtMs: 2000 })).toBe('unconfirmed');
  });

  it('is confirmed once they have', () => {
    expect(getHostConfirmation({ handedOverAtMs: 2000, confirmedAtMs: 3000 })).toBe('confirmed');
  });
});
