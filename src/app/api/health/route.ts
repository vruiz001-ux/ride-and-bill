import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const startedAt = Date.now();

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`health:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const health: Record<string, unknown> = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  };

  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRawUnsafe('SELECT 1');
    health.database = 'connected';
  } catch {
    health.database = 'unavailable';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'operational' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
