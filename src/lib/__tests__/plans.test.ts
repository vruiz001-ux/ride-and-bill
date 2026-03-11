import { describe, it, expect } from 'vitest';
import { getPlanDefinition, PLAN_DEFINITIONS, type PlanId } from '../plans';

describe('Plan Definitions', () => {
  const planIds: PlanId[] = ['free', 'solo', 'pro', 'team', 'custom'];

  it('returns correct plan for each id', () => {
    for (const id of planIds) {
      const plan = getPlanDefinition(id);
      expect(plan.id).toBe(id);
    }
  });

  it('returns free plan for unknown id', () => {
    const plan = getPlanDefinition('nonexistent');
    expect(plan.id).toBe('free');
  });

  // ─── Free plan limits ────────────────────────────────────────────────────

  describe('Free plan', () => {
    const free = PLAN_DEFINITIONS.free;

    it('allows 1 seat', () => expect(free.maxSeats).toBe(1));
    it('allows 0 inboxes', () => expect(free.maxInboxes).toBe(0));
    it('allows 20 receipts/month', () => expect(free.maxReceiptsPerMonth).toBe(20));
    it('has 30-day retention', () => expect(free.retentionDays).toBe(30));
    it('disables gmail sync', () => expect(free.features.gmailSync).toBe(false));
    it('disables outlook sync', () => expect(free.features.outlookSync).toBe(false));
    it('allows manual upload', () => expect(free.features.manualUpload).toBe(true));
    it('disables full PDF export', () => expect(free.features.fullPdfExport).toBe(false));
    it('allows summary PDF export', () => expect(free.features.summaryPdfExport).toBe(true));
    it('disables CSV export', () => expect(free.features.csvExport).toBe(false));
    it('disables company details', () => expect(free.features.companyDetailsInReports).toBe(false));
    it('disables branded reports', () => expect(free.features.brandedReports).toBe(false));
    it('disables duplicate detection', () => expect(free.features.duplicateDetection).toBe(false));
    it('disables shared workspace', () => expect(free.features.sharedWorkspace).toBe(false));
  });

  // ─── Solo plan limits ────────────────────────────────────────────────────

  describe('Solo plan', () => {
    const solo = PLAN_DEFINITIONS.solo;

    it('allows 1 seat', () => expect(solo.maxSeats).toBe(1));
    it('allows 1 inbox', () => expect(solo.maxInboxes).toBe(1));
    it('allows 150 receipts/month', () => expect(solo.maxReceiptsPerMonth).toBe(150));
    it('has 1-year retention', () => expect(solo.retentionDays).toBe(365));
    it('enables gmail sync', () => expect(solo.features.gmailSync).toBe(true));
    it('disables outlook sync', () => expect(solo.features.outlookSync).toBe(false));
    it('enables full PDF export', () => expect(solo.features.fullPdfExport).toBe(true));
    it('enables CSV export', () => expect(solo.features.csvExport).toBe(true));
    it('enables company details', () => expect(solo.features.companyDetailsInReports).toBe(true));
    it('disables shared workspace', () => expect(solo.features.sharedWorkspace).toBe(false));
  });

  // ─── Pro plan limits ─────────────────────────────────────────────────────

  describe('Pro plan', () => {
    const pro = PLAN_DEFINITIONS.pro;

    it('allows 3 seats', () => expect(pro.maxSeats).toBe(3));
    it('allows 3 inboxes', () => expect(pro.maxInboxes).toBe(3));
    it('allows 500 receipts/month', () => expect(pro.maxReceiptsPerMonth).toBe(500));
    it('has 3-year retention', () => expect(pro.retentionDays).toBe(1095));
    it('enables gmail sync', () => expect(pro.features.gmailSync).toBe(true));
    it('enables outlook sync', () => expect(pro.features.outlookSync).toBe(true));
    it('enables duplicate detection', () => expect(pro.features.duplicateDetection).toBe(true));
    it('enables needs-review queue', () => expect(pro.features.needsReviewQueue).toBe(true));
    it('enables business/personal tags', () => expect(pro.features.businessPersonalTags).toBe(true));
    it('enables branded reports', () => expect(pro.features.brandedReports).toBe(true));
    it('enables priority sync', () => expect(pro.features.prioritySync).toBe(true));
    it('disables shared workspace', () => expect(pro.features.sharedWorkspace).toBe(false));
  });

  // ─── Team plan limits ────────────────────────────────────────────────────

  describe('Team plan', () => {
    const team = PLAN_DEFINITIONS.team;

    it('allows 10 seats', () => expect(team.maxSeats).toBe(10));
    it('allows 10 inboxes', () => expect(team.maxInboxes).toBe(10));
    it('allows 1500 receipts/month', () => expect(team.maxReceiptsPerMonth).toBe(1500));
    it('has 7-year retention', () => expect(team.retentionDays).toBe(2555));
    it('enables roles/permissions', () => expect(team.features.rolesPermissions).toBe(true));
    it('enables shared workspace', () => expect(team.features.sharedWorkspace).toBe(true));
    it('enables accountant access', () => expect(team.features.accountantAccess).toBe(true));
    it('enables centralized exports', () => expect(team.features.centralizedExports).toBe(true));
    it('enables priority support', () => expect(team.features.prioritySupport).toBe(true));
  });

  // ─── Feature escalation ──────────────────────────────────────────────────

  it('each higher tier has >= features of lower tier', () => {
    const tiers: PlanId[] = ['free', 'solo', 'pro', 'team'];
    for (let i = 0; i < tiers.length - 1; i++) {
      const lower = PLAN_DEFINITIONS[tiers[i]];
      const higher = PLAN_DEFINITIONS[tiers[i + 1]];

      expect(higher.maxSeats).toBeGreaterThanOrEqual(lower.maxSeats);
      expect(higher.maxInboxes).toBeGreaterThanOrEqual(lower.maxInboxes);
      expect(higher.maxReceiptsPerMonth).toBeGreaterThanOrEqual(lower.maxReceiptsPerMonth);
      expect(higher.retentionDays).toBeGreaterThanOrEqual(lower.retentionDays);
    }
  });
});
