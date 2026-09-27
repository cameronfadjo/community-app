import { describe, expect, it } from 'vitest';
import { getPerkStatChange } from './statChange';

describe('getPerkStatChange', () => {
  it('counts a new redemption as one unlock', () => {
    expect(getPerkStatChange(undefined, {})).toEqual({ unlocked: 1, redeemed: 0 });
  });

  it('counts redeeming once, when the redeemed time first appears', () => {
    expect(getPerkStatChange({}, { redeemedAt: 'now' })).toEqual({ unlocked: 0, redeemed: 1 });
  });

  it('ignores later changes to an already redeemed perk', () => {
    expect(getPerkStatChange({ redeemedAt: 'then' }, { redeemedAt: 'then' })).toEqual({
      unlocked: 0,
      redeemed: 0,
    });
  });

  it('counts both if a redemption is somehow created already redeemed', () => {
    expect(getPerkStatChange(undefined, { redeemedAt: 'now' })).toEqual({ unlocked: 1, redeemed: 1 });
  });

  it('keeps the totals when a record is deleted with its account', () => {
    expect(getPerkStatChange({ redeemedAt: 'then' }, undefined)).toEqual({ unlocked: 0, redeemed: 0 });
  });
});
