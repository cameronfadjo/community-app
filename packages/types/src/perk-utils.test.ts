import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_RADIUS_KM,
  PERK_OPENS_MINUTES_BEFORE,
  PERK_WINDOW_MINUTES,
  getPerkAvailability,
  getPerkRedemptionId,
  getRedemptionState,
  getSecondsLeft,
} from './perk-utils';

const MIN = 60 * 1000;
const now = new Date(2026, 8, 25, 22, 0).getTime();

const event = {
  perkLabel: 'Free drink',
  status: 'scheduled' as const,
  startsAtMs: now - 30 * MIN,
  endsAtMs: now + 180 * MIN,
};

const base = {
  event,
  nowMs: now,
  isSignedIn: true,
  distanceKm: 0.05,
  redemption: null,
};

describe('getRedemptionState', () => {
  const redemption = { unlockedAtMs: now, expiresAtMs: now + PERK_WINDOW_MINUTES * MIN };

  it('is unlocked until it expires', () => {
    expect(getRedemptionState(redemption, now + 5 * MIN)).toBe('unlocked');
  });

  it('expires at the end of the window', () => {
    expect(getRedemptionState(redemption, now + PERK_WINDOW_MINUTES * MIN)).toBe('expired');
  });

  it('stays redeemed even after the window has passed', () => {
    const redeemed = { ...redemption, redeemedAtMs: now + 2 * MIN };
    expect(getRedemptionState(redeemed, now + 60 * MIN)).toBe('redeemed');
  });
});

describe('getSecondsLeft', () => {
  it('counts down to the expiry and stops at zero', () => {
    expect(getSecondsLeft(now + 90 * 1000, now)).toBe(90);
    expect(getSecondsLeft(now - 1000, now)).toBe(0);
  });
});

describe('getPerkRedemptionId', () => {
  it('gives each person one redemption per event', () => {
    expect(getPerkRedemptionId('event_1', 'user_1')).toBe('event_1_user_1');
  });
});

describe('getPerkAvailability', () => {
  it('is ready when signed in, at the venue, during the event', () => {
    expect(getPerkAvailability(base)).toBe('ready');
  });

  it('has nothing to offer when the event has no perk', () => {
    expect(getPerkAvailability({ ...base, event: { ...event, perkLabel: undefined } })).toBe('none');
  });

  it('is unavailable for a cancelled event', () => {
    expect(
      getPerkAvailability({ ...base, event: { ...event, status: 'cancelled' as const } })
    ).toBe('ended');
  });

  it('opens shortly before the start, not earlier', () => {
    const later = { ...event, startsAtMs: now + (PERK_OPENS_MINUTES_BEFORE + 1) * MIN };
    expect(getPerkAvailability({ ...base, event: later })).toBe('not_yet');

    const soon = { ...event, startsAtMs: now + PERK_OPENS_MINUTES_BEFORE * MIN };
    expect(getPerkAvailability({ ...base, event: soon })).toBe('ready');
  });

  it('closes when the event ends', () => {
    expect(getPerkAvailability({ ...base, nowMs: event.endsAtMs })).toBe('ended');
  });

  it('asks for location before anything else it needs', () => {
    expect(getPerkAvailability({ ...base, distanceKm: undefined, isSignedIn: false })).toBe(
      'needs_location'
    );
  });

  it('is too far outside the arrival radius', () => {
    expect(getPerkAvailability({ ...base, distanceKm: ARRIVAL_RADIUS_KM + 0.01 })).toBe('too_far');
    expect(getPerkAvailability({ ...base, distanceKm: ARRIVAL_RADIUS_KM })).toBe('ready');
  });

  it('asks for sign-in only once the person has arrived', () => {
    expect(getPerkAvailability({ ...base, isSignedIn: false })).toBe('needs_sign_in');
    expect(getPerkAvailability({ ...base, isSignedIn: false, distanceKm: 2 })).toBe('too_far');
  });

  it('reports an existing redemption ahead of everything else', () => {
    const unlocked = { unlockedAtMs: now - MIN, expiresAtMs: now + 14 * MIN };
    // Walking to the bar shouldn't lose the perk if the signal drifts
    expect(getPerkAvailability({ ...base, redemption: unlocked, distanceKm: 5 })).toBe('unlocked');

    const redeemed = { ...unlocked, redeemedAtMs: now };
    expect(getPerkAvailability({ ...base, redemption: redeemed })).toBe('redeemed');

    const expired = { unlockedAtMs: now - 20 * MIN, expiresAtMs: now - 5 * MIN };
    expect(getPerkAvailability({ ...base, redemption: expired })).toBe('expired');
  });
});
