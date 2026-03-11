import { describe, it, expect } from 'vitest';
import {
  checkCanSync,
  checkCanExport,
  checkCanInvite,
  checkCanConnectInbox,
  type Entitlements,
} from '../services/entitlements';
import { PLAN_DEFINITIONS } from '../plans';

// Helper to create test entitlements
function makeEntitlements(overrides: Partial<Entitlements> = {}): Entitlements {
  const plan = overrides.plan ?? PLAN_DEFINITIONS.free;
  return {
    workspaceId: 'ws-test',
    plan,
    subscriptionStatus: 'active',
    isActive: true,
    isGracePeriod: false,
    isReadOnly: false,
    maxSeats: plan.maxSeats,
    maxInboxes: plan.maxInboxes,
    maxReceiptsPerMonth: plan.maxReceiptsPerMonth,
    retentionDays: plan.retentionDays,
    retentionCutoff: new Date(),
    features: plan.features,
    currentSeats: 1,
    currentInboxes: 0,
    isOverSeatLimit: false,
    isOverInboxLimit: false,
    ...overrides,
  };
}

describe('checkCanSync', () => {
  it('blocks sync on free plan (0 inboxes)', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    const err = checkCanSync(ent, 'gmail');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('SYNC_NOT_AVAILABLE');
  });

  it('allows gmail sync on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    expect(checkCanSync(ent, 'gmail')).toBeNull();
  });

  it('blocks outlook sync on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    const err = checkCanSync(ent, 'outlook');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('OUTLOOK_NOT_AVAILABLE');
  });

  it('allows outlook sync on pro plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.pro, maxInboxes: 3 });
    expect(checkCanSync(ent, 'outlook')).toBeNull();
  });

  it('blocks sync when over inbox limit', () => {
    const ent = makeEntitlements({
      plan: PLAN_DEFINITIONS.solo,
      maxInboxes: 1,
      currentInboxes: 2,
      isOverInboxLimit: true,
    });
    const err = checkCanSync(ent, 'gmail');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('INBOX_LIMIT_REACHED');
  });

  it('blocks sync when subscription inactive', () => {
    const ent = makeEntitlements({
      plan: PLAN_DEFINITIONS.solo,
      maxInboxes: 1,
      isReadOnly: true,
      subscriptionStatus: 'canceled',
    });
    const err = checkCanSync(ent, 'gmail');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('SUBSCRIPTION_INACTIVE');
  });
});

describe('checkCanExport', () => {
  it('allows summary PDF on free plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    expect(checkCanExport(ent, 'pdf', 'summary')).toBeNull();
  });

  it('blocks full PDF on free plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    const err = checkCanExport(ent, 'pdf', 'full');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('FULL_PDF_NOT_AVAILABLE');
  });

  it('blocks CSV on free plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    const err = checkCanExport(ent, 'csv');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('CSV_NOT_AVAILABLE');
  });

  it('allows full PDF on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo });
    expect(checkCanExport(ent, 'pdf', 'full')).toBeNull();
  });

  it('allows CSV on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo });
    expect(checkCanExport(ent, 'csv')).toBeNull();
  });

  it('blocks export when subscription inactive', () => {
    const ent = makeEntitlements({
      plan: PLAN_DEFINITIONS.solo,
      isReadOnly: true,
      subscriptionStatus: 'canceled',
    });
    const err = checkCanExport(ent, 'pdf');
    expect(err).not.toBeNull();
    expect(err!.code).toBe('SUBSCRIPTION_INACTIVE');
  });
});

describe('checkCanInvite', () => {
  it('blocks invites on free plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    const err = checkCanInvite(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('TEAM_NOT_AVAILABLE');
  });

  it('blocks invites on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo });
    const err = checkCanInvite(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('TEAM_NOT_AVAILABLE');
  });

  it('blocks invites on pro plan (no sharedWorkspace)', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.pro });
    const err = checkCanInvite(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('TEAM_NOT_AVAILABLE');
  });

  it('allows invites on team plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.team });
    expect(checkCanInvite(ent)).toBeNull();
  });

  it('blocks invites when over seat limit', () => {
    const ent = makeEntitlements({
      plan: PLAN_DEFINITIONS.team,
      currentSeats: 11,
      isOverSeatLimit: true,
    });
    const err = checkCanInvite(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('SEAT_LIMIT_REACHED');
  });

  it('blocks invites when subscription inactive', () => {
    const ent = makeEntitlements({
      plan: PLAN_DEFINITIONS.team,
      isReadOnly: true,
      subscriptionStatus: 'canceled',
    });
    const err = checkCanInvite(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('SUBSCRIPTION_INACTIVE');
  });
});

describe('checkCanConnectInbox', () => {
  it('blocks inbox on free plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.free });
    const err = checkCanConnectInbox(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('INBOX_NOT_AVAILABLE');
  });

  it('allows first inbox on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo, maxInboxes: 1, currentInboxes: 0 });
    expect(checkCanConnectInbox(ent)).toBeNull();
  });

  it('blocks second inbox on solo plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.solo, maxInboxes: 1, currentInboxes: 1 });
    const err = checkCanConnectInbox(ent);
    expect(err).not.toBeNull();
    expect(err!.code).toBe('INBOX_LIMIT_REACHED');
  });

  it('allows up to 3 inboxes on pro plan', () => {
    const ent = makeEntitlements({ plan: PLAN_DEFINITIONS.pro, maxInboxes: 3, currentInboxes: 2 });
    expect(checkCanConnectInbox(ent)).toBeNull();
  });
});

describe('Subscription status behavior', () => {
  it('active status allows everything', () => {
    const ent = makeEntitlements({ subscriptionStatus: 'active', plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    expect(ent.isActive).toBe(true);
    expect(ent.isReadOnly).toBe(false);
    expect(ent.isGracePeriod).toBe(false);
  });

  it('trialing status allows everything', () => {
    const ent = makeEntitlements({ subscriptionStatus: 'trialing', plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    expect(ent.isActive).toBe(true);
    expect(ent.isReadOnly).toBe(false);
  });

  it('past_due grants grace period', () => {
    const ent = makeEntitlements({ subscriptionStatus: 'past_due', isGracePeriod: true, isActive: true, plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    expect(ent.isActive).toBe(true);
    expect(ent.isGracePeriod).toBe(true);
    expect(ent.isReadOnly).toBe(false);
  });

  it('canceled is read-only', () => {
    const ent = makeEntitlements({ subscriptionStatus: 'canceled', isReadOnly: true, isActive: false, plan: PLAN_DEFINITIONS.solo, maxInboxes: 1 });
    expect(ent.isReadOnly).toBe(true);
    expect(ent.isActive).toBe(false);
  });
});
