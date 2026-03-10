import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Check cookies
  const cookieStore = await cookies();
  results.authCookies = cookieStore.getAll()
    .filter(c => c.name.includes('next-auth') || c.name.includes('__Secure'))
    .map(c => ({ name: c.name, valueLen: c.value.length }));

  // Check DB state
  try {
    const user = await prisma.user.findFirst({ select: { id: true, email: true, name: true, role: true, emailVerified: true } });
    results.user = user;
    const account = await prisma.account.findFirst({ select: { id: true, userId: true, provider: true, providerAccountId: true, type: true } });
    results.account = account;

    // Test what PrismaAdapter.getUserByAccount does
    if (account) {
      const linkedUser = await prisma.user.findFirst({
        where: {
          accounts: { some: { provider: account.provider, providerAccountId: account.providerAccountId } },
        },
      });
      results.linkedUser = linkedUser ? { id: linkedUser.id, email: linkedUser.email } : null;
    }
  } catch (e) {
    results.dbError = e instanceof Error ? e.message : String(e);
  }

  // Test bcryptjs import
  try {
    const bcrypt = await import('bcryptjs');
    results.bcryptOk = typeof bcrypt.compare === 'function';
  } catch (e) {
    results.bcryptError = e instanceof Error ? e.message : String(e);
  }

  // Test auth module import
  try {
    const auth = await import('@/lib/auth');
    results.authOptionsOk = !!auth.authOptions;
    results.providersCount = auth.authOptions?.providers?.length;
  } catch (e) {
    results.authImportError = e instanceof Error ? e.message : String(e);
  }

  results.nextauthUrl = process.env.NEXTAUTH_URL;
  results.secretSet = !!process.env.NEXTAUTH_SECRET;

  return NextResponse.json(results);
}
