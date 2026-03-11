import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserEntitlements, checkCanInvite } from '@/lib/services/entitlements';
import { getWorkspaceUsageSummary } from '@/lib/services/usage';
import { z } from 'zod';

// GET workspace details, members, and usage
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlements = await getUserEntitlements(session.user.id);
  const workspaceId = entitlements.workspaceId;

  const [workspace, members, usage] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    getWorkspaceUsageSummary(workspaceId),
  ]);

  return NextResponse.json({
    workspace: {
      id: workspace?.id,
      name: workspace?.name,
      ownerUserId: workspace?.ownerUserId,
    },
    members: members.map(m => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    })),
    usage: {
      ...usage,
      receiptsLimit: entitlements.maxReceiptsPerMonth,
      seatsLimit: entitlements.maxSeats,
      inboxesLimit: entitlements.maxInboxes,
    },
    plan: {
      id: entitlements.plan.id,
      name: entitlements.plan.name,
      status: entitlements.subscriptionStatus,
      isActive: entitlements.isActive,
      isOverSeatLimit: entitlements.isOverSeatLimit,
      isOverInboxLimit: entitlements.isOverInboxLimit,
      features: entitlements.features,
    },
  });
}

// POST — invite a user to workspace
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'viewer']).default('member'),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlements = await getUserEntitlements(session.user.id);

  // Check team features
  const inviteError = checkCanInvite(entitlements);
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message, code: inviteError.code }, { status: 403 });
  }

  // Only owner/admin can invite
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: entitlements.workspaceId,
        userId: session.user.id,
      },
    },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only workspace owners or admins can invite members' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Find user by email
  const invitedUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!invitedUser) {
    return NextResponse.json({ error: 'User not found. They must register first.' }, { status: 404 });
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: entitlements.workspaceId,
        userId: invitedUser.id,
      },
    },
  });
  if (existingMember) {
    return NextResponse.json({ error: 'User is already a workspace member' }, { status: 409 });
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId: entitlements.workspaceId,
      userId: invitedUser.id,
      role: parsed.data.role,
    },
  });

  return NextResponse.json({
    id: member.id,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  }, { status: 201 });
}
