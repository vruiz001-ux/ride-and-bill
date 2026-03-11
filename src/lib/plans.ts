// ─── Plan Definitions ─────────────────────────────────────────────────────────
// Single source of truth for all plan limits, features, and behavior.

export type PlanId = 'free' | 'solo' | 'pro' | 'team' | 'custom';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  maxSeats: number;
  maxInboxes: number;
  maxReceiptsPerMonth: number;
  retentionDays: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  gmailSync: boolean;
  outlookSync: boolean;
  manualUpload: boolean;
  fullPdfExport: boolean;
  summaryPdfExport: boolean;
  csvExport: boolean;
  companyDetailsInReports: boolean;
  brandedReports: boolean;
  duplicateDetection: boolean;
  needsReviewQueue: boolean;
  businessPersonalTags: boolean;
  prioritySync: boolean;
  rolesPermissions: boolean;
  sharedWorkspace: boolean;
  accountantAccess: boolean;
  centralizedExports: boolean;
  prioritySupport: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    maxSeats: 1,
    maxInboxes: 0,
    maxReceiptsPerMonth: 20,
    retentionDays: 30,
    features: {
      gmailSync: false,
      outlookSync: false,
      manualUpload: true,
      fullPdfExport: false,
      summaryPdfExport: true,
      csvExport: false,
      companyDetailsInReports: false,
      brandedReports: false,
      duplicateDetection: false,
      needsReviewQueue: false,
      businessPersonalTags: false,
      prioritySync: false,
      rolesPermissions: false,
      sharedWorkspace: false,
      accountantAccess: false,
      centralizedExports: false,
      prioritySupport: false,
    },
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    maxSeats: 1,
    maxInboxes: 1,
    maxReceiptsPerMonth: 150,
    retentionDays: 365,
    features: {
      gmailSync: true,
      outlookSync: false,
      manualUpload: true,
      fullPdfExport: true,
      summaryPdfExport: true,
      csvExport: true,
      companyDetailsInReports: true,
      brandedReports: false,
      duplicateDetection: false,
      needsReviewQueue: false,
      businessPersonalTags: false,
      prioritySync: false,
      rolesPermissions: false,
      sharedWorkspace: false,
      accountantAccess: false,
      centralizedExports: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    maxSeats: 3,
    maxInboxes: 3,
    maxReceiptsPerMonth: 500,
    retentionDays: 1095, // 3 years
    features: {
      gmailSync: true,
      outlookSync: true,
      manualUpload: true,
      fullPdfExport: true,
      summaryPdfExport: true,
      csvExport: true,
      companyDetailsInReports: true,
      brandedReports: true,
      duplicateDetection: true,
      needsReviewQueue: true,
      businessPersonalTags: true,
      prioritySync: true,
      rolesPermissions: false,
      sharedWorkspace: false,
      accountantAccess: false,
      centralizedExports: false,
      prioritySupport: false,
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    maxSeats: 10,
    maxInboxes: 10,
    maxReceiptsPerMonth: 1500,
    retentionDays: 2555, // 7 years
    features: {
      gmailSync: true,
      outlookSync: true,
      manualUpload: true,
      fullPdfExport: true,
      summaryPdfExport: true,
      csvExport: true,
      companyDetailsInReports: true,
      brandedReports: true,
      duplicateDetection: true,
      needsReviewQueue: true,
      businessPersonalTags: true,
      prioritySync: true,
      rolesPermissions: true,
      sharedWorkspace: true,
      accountantAccess: true,
      centralizedExports: true,
      prioritySupport: true,
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    maxSeats: 999,
    maxInboxes: 999,
    maxReceiptsPerMonth: 99999,
    retentionDays: 3650, // 10 years default
    features: {
      gmailSync: true,
      outlookSync: true,
      manualUpload: true,
      fullPdfExport: true,
      summaryPdfExport: true,
      csvExport: true,
      companyDetailsInReports: true,
      brandedReports: true,
      duplicateDetection: true,
      needsReviewQueue: true,
      businessPersonalTags: true,
      prioritySync: true,
      rolesPermissions: true,
      sharedWorkspace: true,
      accountantAccess: true,
      centralizedExports: true,
      prioritySupport: true,
    },
  },
};

export function getPlanDefinition(planId: string): PlanDefinition {
  return PLAN_DEFINITIONS[planId as PlanId] ?? PLAN_DEFINITIONS.free;
}
