import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserEntitlements, checkCanGenerateStatement } from '@/lib/services/entitlements';
import { generateId } from '@/lib/utils';

// ─── GET /api/statements ─────────────────────────────────────────────────────
// List statements for the current workspace

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entitlements = await getUserEntitlements(session.user.id);

    const statements = await prisma.statement.findMany({
      where: { workspaceId: entitlements.workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      statements: statements.map((s) => ({
        ...s,
        periodStart: s.periodStart.toISOString(),
        periodEnd: s.periodEnd.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        filtersJson: JSON.parse(s.filtersJson),
      })),
    });
  } catch (error) {
    console.error('[statements/GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/statements ────────────────────────────────────────────────────
// Generate a new statement from filtered receipts

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entitlements = await getUserEntitlements(session.user.id);

    // Entitlement gate
    const gateError = checkCanGenerateStatement(entitlements);
    if (gateError) {
      return NextResponse.json(
        { error: gateError.message, code: gateError.code },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      title,
      dateFrom,
      dateTo,
      countries,
      currencies,
      providers,
      outputCurrency,
      applyMarkup,
      markupPercent,
    } = body;

    // Validate required dates
    const periodStart = new Date(dateFrom);
    const periodEnd = new Date(dateTo);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid dateFrom or dateTo' }, { status: 400 });
    }
    if (periodStart > periodEnd) {
      return NextResponse.json({ error: 'dateFrom must be before dateTo' }, { status: 400 });
    }

    // Build receipt query
    const where: Record<string, unknown> = {
      workspaceId: entitlements.workspaceId,
      tripDate: {
        gte: periodStart > entitlements.retentionCutoff ? periodStart : entitlements.retentionCutoff,
        lte: periodEnd,
      },
      status: { not: 'failed' },
    };

    if (countries?.length) where.country = { in: countries };
    if (currencies?.length) where.currency = { in: currencies };
    if (providers?.length) where.provider = { in: providers };

    const receipts = await prisma.receipt.findMany({
      where,
      select: { id: true, amountTotal: true, currency: true },
    });

    // Compute totals
    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + (r.amountTotal ?? 0), 0);
    const shouldMarkup = applyMarkup === true && typeof markupPercent === 'number' && markupPercent > 0;
    const totalWithMarkup = shouldMarkup
      ? Math.round(totalAmount * (1 + markupPercent / 100) * 100) / 100
      : null;

    // Determine dominant currency from receipts
    const currencyMap = new Map<string, number>();
    for (const r of receipts) {
      currencyMap.set(r.currency, (currencyMap.get(r.currency) ?? 0) + (r.amountTotal ?? 0));
    }
    let dominantCurrency = outputCurrency || 'EUR';
    if (!outputCurrency && currencyMap.size > 0) {
      let max = 0;
      for (const [cur, amt] of currencyMap) {
        if (amt > max) { max = amt; dominantCurrency = cur; }
      }
    }

    const filters = {
      countries: countries ?? [],
      currencies: currencies ?? [],
      providers: providers ?? [],
    };

    const statementId = generateId();

    const statement = await prisma.statement.create({
      data: {
        id: statementId,
        userId: session.user.id,
        workspaceId: entitlements.workspaceId,
        title: title || `Statement ${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)}`,
        periodStart,
        periodEnd,
        filtersJson: JSON.stringify(filters),
        totalReceipts,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalAmountCurrency: dominantCurrency,
        outputCurrency: outputCurrency || dominantCurrency,
        applyMarkup: shouldMarkup,
        markupPercent: shouldMarkup ? markupPercent : 0,
        totalWithMarkup,
        status: 'generated',
      },
    });

    // Link receipts
    if (receipts.length > 0) {
      await prisma.statementReceipt.createMany({
        data: receipts.map((r) => ({
          statementId: statement.id,
          receiptId: r.id,
        })),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: entitlements.workspaceId,
        action: 'statement.generated',
        entityType: 'Statement',
        entityId: statement.id,
        details: JSON.stringify({ totalReceipts, totalAmount, filters }),
      },
    });

    return NextResponse.json({
      statement: {
        ...statement,
        periodStart: statement.periodStart.toISOString(),
        periodEnd: statement.periodEnd.toISOString(),
        createdAt: statement.createdAt.toISOString(),
        updatedAt: statement.updatedAt.toISOString(),
        filtersJson: filters,
        receiptCount: totalReceipts,
      },
    });
  } catch (error) {
    console.error('[statements/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
