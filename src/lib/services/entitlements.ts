// ─── Entitlement Service ──────────────────────────────────────────────────────
// Central source of truth for what a workspace/user can do.
// Every API route, sync job, export, and UI check must go through this service.

import { prisma } from '@/lib/prisma';
import {
  getPlanDefinition,
  type PlanId,
  type PlanDefinition,
  type PlanFeatures,
  type SubscriptionStatus,
} from '@/lib/plans';

export interface Entitlements {
  workspaceId: string;
  plan: PlanDefinition;
  subscriptionStatus: SubscriptionStatus;
  isActive: boolean;
  isGracePeriod: boolean;
  isReadOnly: boolean;
  maxSeats: number;
  maxInboxes: number;
  maxReceiptsPerMonth: number;
  retentionDays: number;
  retentionCutoff: Date;
  features: PlanFeatures;
  currentSeats: number;
  currentInboxes: number;
  isOverSeatLimit: boolean;
  isOverInboxLimit: boolean;
}

// ─── Status behavior rules ───────────────────────────────────────────────────
// active/trialing: full access
// past_due: grace period — can view data, limited new processing
// canceled/unpaid/incomplete: read-only — can view, no new sync/export/invites

function statusFlags(status: SubscriptionStatus) {
  switch (status) {
    case 'active':
    case 'trialing':
      return { isActive: true, isGracePeriod: false, isReadOnly: false };
    case 'past_due':
      return { isActive: true, isGracePeriod: true, isReadOnly: false };
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
      return { isActive: false, isGracePeriod: false, isReadOnly: true };
    default:
      return { isActive: false, isGracePeriod: false, isReadOnly: true };
  }
}

// ─── Resolve entitlements for a workspace ────────────────────────────────────

export async function getWorkspaceEntitlements(workspaceId: string): Promise<Entitlements> {
  const [subscription, memberCount, inboxCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.connectedEmailAccount.count({ where: { workspaceId, status: 'active' } }),
  ]);

  const planId = (subscription?.plan ?? 'free') as PlanId;
  const plan = getPlanDefinition(planId);
  const subscriptionStatus = (subscription?.status ?? 'active') as SubscriptionStatus;
  const flags = statusFlags(subscriptionStatus);

  // Custom plan overrides
  const maxSeats = subscription?.customSeats ?? plan.maxSeats;
  const maxInboxes = subscription?.customInboxes ?? plan.maxInboxes;
  const maxReceiptsPerMonth = subscription?.customReceipts ?? plan.maxReceiptsPerMonth;
  const retentionDays = subscription?.customRetentionDays ?? plan.retentionDays;

  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - retentionDays);

  return {
    workspaceId,
    plan,
    subscriptionStatus,
    ...flags,
    maxSeats,
    maxInboxes,
    maxReceiptsPerMonth,
    retentionDays,
    retentionCutoff,
    features: plan.features,
    currentSeats: memberCount,
    currentInboxes: inboxCount,
    isOverSeatLimit: memberCount > maxSeats,
    isOverInboxLimit: inboxCount > maxInboxes,
  };
}

// ─── Resolve entitlements for a user (finds their workspace) ─────────────────

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const workspaceId = await resolveUserWorkspace(userId);
  return getWorkspaceEntitlements(workspaceId);
}

// ─── Resolve user's primary workspace (auto-create if missing) ───────────────

export async function resolveUserWorkspace(userId: string): Promise<string> {
  // Check if user has any workspace membership
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (membership) {
    return membership.workspaceId;
  }

  // Auto-create personal workspace for user (migration path)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const workspace = await prisma.workspace.create({
    data: {
      name: user?.name ? `${user.name}'s Workspace` : 'My Workspace',
      ownerUserId: userId,
      members: {
        create: { userId, role: 'owner' },
      },
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          billingCycleAnchor: now,
        },
      },
    },
  });

  // Migrate existing user data to this workspace
  await migrateUserDataToWorkspace(userId, workspace.id);

  return workspace.id;
}

// ─── Migrate existing user data into workspace ───────────────────────────────

async function migrateUserDataToWorkspace(userId: string, workspaceId: string) {
  await Promise.all([
    prisma.receipt.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId },
    }),
    prisma.connectedEmailAccount.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId },
    }),
    prisma.billingEntity.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId },
    }),
    prisma.invoiceBatch.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId },
    }),
    prisma.exportJob.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId },
    }),
  ]);
}

// ─── Entitlement check helpers ───────────────────────────────────────────────

export interface EntitlementError {
  code: string;
  message: string;
  limit?: number;
  current?: number;
  plan?: string;
}

export function checkCanSync(
  entitlements: Entitlements,
  emailProvider: 'gmail' | 'outlook'
): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive. Please update your billing to continue syncing.',
      plan: entitlements.plan.name,
    };
  }

  if (entitlements.maxInboxes === 0) {
    return {
      code: 'SYNC_NOT_AVAILABLE',
      message: 'Email sync is not available on the Free plan. Upload receipts manually or upgrade.',
      plan: entitlements.plan.name,
    };
  }

  if (emailProvider === 'outlook' && !entitlements.features.outlookSync) {
    return {
      code: 'OUTLOOK_NOT_AVAILABLE',
      message: 'Outlook sync requires Pro plan or higher.',
      plan: entitlements.plan.name,
    };
  }

  if (emailProvider === 'gmail' && !entitlements.features.gmailSync) {
    return {
      code: 'GMAIL_NOT_AVAILABLE',
      message: 'Gmail sync is not available on your current plan.',
      plan: entitlements.plan.name,
    };
  }

  if (entitlements.isOverInboxLimit) {
    return {
      code: 'INBOX_LIMIT_REACHED',
      message: `Your plan allows ${entitlements.maxInboxes} connected inbox(es). You have ${entitlements.currentInboxes}. Please disconnect an inbox or upgrade.`,
      limit: entitlements.maxInboxes,
      current: entitlements.currentInboxes,
      plan: entitlements.plan.name,
    };
  }

  return null;
}

export function checkCanExport(
  entitlements: Entitlements,
  format: 'pdf' | 'csv' | 'xlsx' | 'zip',
  exportType: 'summary' | 'full' = 'full'
): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive. Please update your billing to export.',
      plan: entitlements.plan.name,
    };
  }

  if (format === 'csv' && !entitlements.features.csvExport) {
    return {
      code: 'CSV_NOT_AVAILABLE',
      message: 'CSV export requires a paid plan. Upgrade to access CSV exports.',
      plan: entitlements.plan.name,
    };
  }

  if (format === 'xlsx' && !entitlements.features.xlsxExport) {
    return {
      code: 'XLSX_NOT_AVAILABLE',
      message: 'XLSX export requires Solo plan or higher.',
      plan: entitlements.plan.name,
    };
  }

  if (format === 'zip' && !entitlements.features.zipExport) {
    return {
      code: 'ZIP_NOT_AVAILABLE',
      message: 'ZIP bundle export requires Pro plan or higher.',
      plan: entitlements.plan.name,
    };
  }

  if (format === 'pdf' && exportType === 'full' && !entitlements.features.fullPdfExport) {
    return {
      code: 'FULL_PDF_NOT_AVAILABLE',
      message: 'Full PDF export with receipt details requires a paid plan. You can export a summary PDF on the Free plan.',
      plan: entitlements.plan.name,
    };
  }

  return null;
}

export function checkCanGenerateStatement(entitlements: Entitlements): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive. Please update your billing.',
      plan: entitlements.plan.name,
    };
  }

  if (!entitlements.features.statementGenerator) {
    return {
      code: 'STATEMENTS_NOT_AVAILABLE',
      message: 'Statement generation requires Solo plan or higher.',
      plan: entitlements.plan.name,
    };
  }

  return null;
}

export function checkCanUpload(entitlements: Entitlements): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive.',
      plan: entitlements.plan.name,
    };
  }

  if (!entitlements.features.manualUpload) {
    return {
      code: 'UPLOAD_NOT_AVAILABLE',
      message: 'Manual upload is not available on your current plan.',
      plan: entitlements.plan.name,
    };
  }

  return null;
}

export function checkCanInvite(entitlements: Entitlements): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive. Please update your billing.',
      plan: entitlements.plan.name,
    };
  }

  if (!entitlements.features.sharedWorkspace) {
    return {
      code: 'TEAM_NOT_AVAILABLE',
      message: 'Team features require a Team plan or higher.',
      plan: entitlements.plan.name,
    };
  }

  if (entitlements.isOverSeatLimit) {
    return {
      code: 'SEAT_LIMIT_REACHED',
      message: `Your plan allows ${entitlements.maxSeats} seat(s). You have ${entitlements.currentSeats}. Please remove a member or upgrade.`,
      limit: entitlements.maxSeats,
      current: entitlements.currentSeats,
      plan: entitlements.plan.name,
    };
  }

  return null;
}

export function checkCanConnectInbox(entitlements: Entitlements): EntitlementError | null {
  if (entitlements.isReadOnly) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive.',
      plan: entitlements.plan.name,
    };
  }

  if (entitlements.maxInboxes === 0) {
    return {
      code: 'INBOX_NOT_AVAILABLE',
      message: 'Email inbox connections are not available on the Free plan. Upgrade to connect an inbox.',
      plan: entitlements.plan.name,
    };
  }

  if (entitlements.currentInboxes >= entitlements.maxInboxes) {
    return {
      code: 'INBOX_LIMIT_REACHED',
      message: `Your plan allows ${entitlements.maxInboxes} connected inbox(es). Disconnect an existing inbox or upgrade.`,
      limit: entitlements.maxInboxes,
      current: entitlements.currentInboxes,
      plan: entitlements.plan.name,
    };
  }

  return null;
}
