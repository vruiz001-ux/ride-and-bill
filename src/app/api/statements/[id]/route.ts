import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ─── GET /api/statements/[id] ────────────────────────────────────────────────
// Get a single statement with its linked receipts

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const statement = await prisma.statement.findFirst({
      where: { id, userId: session.user.id },
      include: {
        statementReceipts: {
          include: {
            receipt: true,
          },
        },
      },
    });

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    // Flatten receipts from junction table
    const receipts = statement.statementReceipts.map((sr) => ({
      ...sr.receipt,
      tripDate: sr.receipt.tripDate.toISOString(),
      importDate: sr.receipt.importDate.toISOString(),
      createdAt: sr.receipt.createdAt.toISOString(),
      updatedAt: sr.receipt.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      statement: {
        id: statement.id,
        userId: statement.userId,
        workspaceId: statement.workspaceId,
        title: statement.title,
        periodStart: statement.periodStart.toISOString(),
        periodEnd: statement.periodEnd.toISOString(),
        filtersJson: JSON.parse(statement.filtersJson),
        totalReceipts: statement.totalReceipts,
        totalAmount: statement.totalAmount,
        totalAmountCurrency: statement.totalAmountCurrency,
        outputCurrency: statement.outputCurrency,
        applyMarkup: statement.applyMarkup,
        markupPercent: statement.markupPercent,
        totalWithMarkup: statement.totalWithMarkup,
        status: statement.status,
        createdAt: statement.createdAt.toISOString(),
        updatedAt: statement.updatedAt.toISOString(),
        receipts,
      },
    });
  } catch (error) {
    console.error('[statements/[id]/GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
