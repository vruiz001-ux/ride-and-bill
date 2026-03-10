import { NextResponse } from 'next/server';

export async function GET() {
  const info: Record<string, unknown> = {
    node: process.version,
    tursoUrl: process.env.TURSO_DATABASE_URL ? 'set' : 'missing',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? 'set' : 'missing',
    nextauthUrl: process.env.NEXTAUTH_URL || 'missing',
    nextauthSecret: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'set' : 'missing',
  };

  try {
    const { prisma } = await import('@/lib/prisma');
    const count = await prisma.user.count();
    info.db = `connected (${count} users)`;

    // Get recent debug logs
    const logs = await prisma.$queryRawUnsafe(
      `SELECT ts, msg FROM _debug_log ORDER BY id DESC LIMIT 20`
    );
    info.debugLogs = logs;
  } catch (e: unknown) {
    info.db = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(info);
}
