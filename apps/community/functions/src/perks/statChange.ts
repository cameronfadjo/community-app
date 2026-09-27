export interface PerkStatChange {
  unlocked: number;
  redeemed: number;
}

interface RedemptionFields {
  redeemedAt?: unknown;
}

/**
 * How a change to one redemption record moves an event's perk totals.
 * Deleting a record (when someone deletes their account) leaves the totals
 * alone: they are history, and hold nothing personal.
 */
export const getPerkStatChange = (
  before: RedemptionFields | undefined,
  after: RedemptionFields | undefined
): PerkStatChange => {
  if (!after) {
    return { unlocked: 0, redeemed: 0 };
  }

  const wasRedeemed = Boolean(before?.redeemedAt);
  const isRedeemed = Boolean(after.redeemedAt);

  return {
    unlocked: before ? 0 : 1,
    redeemed: !wasRedeemed && isRedeemed ? 1 : 0,
  };
};
