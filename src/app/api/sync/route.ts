import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { searchReceiptEmails, fetchEmail } from '@/lib/services/gmail';
import { isUberReceipt, parseUberReceipt } from '@/lib/parsers/uber';
import { isBoltReceipt, parseBoltReceipt } from '@/lib/parsers/bolt';
import { convertAmount } from '@/lib/services/fx';

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Find or create connected email account record
  let emailAccount = await prisma.connectedEmailAccount.findFirst({
    where: { userId, provider: 'gmail' },
  });

  if (!emailAccount) {
    // Auto-create from the Google account
    const googleAccount = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    });
    if (!googleAccount) {
      return NextResponse.json({ error: 'No Google account connected' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    emailAccount = await prisma.connectedEmailAccount.create({
      data: {
        userId,
        provider: 'gmail',
        email: user?.email || 'unknown',
        status: 'active',
      },
    });
  }

  // Update sync status
  await prisma.connectedEmailAccount.update({
    where: { id: emailAccount.id },
    data: { syncStatus: 'syncing' },
  });

  try {
    // Get user's default currency
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const targetCurrency = user?.defaultCurrency || 'EUR';
    const markupPercent = user?.defaultMarkupPercent ?? 5;

    // Search for receipt emails (use lastSyncAt if available)
    const afterDate = emailAccount.lastSyncAt
      ? emailAccount.lastSyncAt.toISOString().split('T')[0].replace(/-/g, '/')
      : undefined;

    const messageIds = await searchReceiptEmails(userId, afterDate);

    let newReceipts = 0;
    let totalScanned = 0;

    for (const messageId of messageIds) {
      totalScanned++;

      // Check for duplicate
      const existing = await prisma.receipt.findUnique({
        where: { sourceMessageId: messageId },
      });
      if (existing) continue;

      // Fetch the full email
      const email = await fetchEmail(userId, messageId);

      // Detect provider and parse
      let parsed = null;
      if (isUberReceipt(email)) {
        parsed = parseUberReceipt(email);
      } else if (isBoltReceipt(email)) {
        parsed = parseBoltReceipt(email);
      }

      if (!parsed) continue;

      // Determine status
      const status = parsed.confidence < 0.5 || parsed.amountTotal === 0 ? 'review' : 'parsed';

      // FX conversion
      let fxData = null;
      if (parsed.amountTotal > 0) {
        const receiptDate = new Date(parsed.tripDate).toISOString().split('T')[0];
        fxData = convertAmount(
          parsed.amountTotal,
          parsed.currency,
          targetCurrency,
          receiptDate,
          markupPercent
        );
      }

      // Store receipt
      await prisma.receipt.create({
        data: {
          userId,
          provider: parsed.provider,
          sourceEmailAccountId: emailAccount.id,
          sourceMessageId: messageId,
          receiptExternalId: parsed.receiptExternalId,
          tripDate: new Date(parsed.tripDate),
          country: parsed.country,
          countryCode: parsed.countryCode,
          city: parsed.city,
          pickupLocation: parsed.pickupLocation,
          dropoffLocation: parsed.dropoffLocation,
          amountTotal: parsed.amountTotal,
          amountTax: parsed.amountTax,
          currency: parsed.currency,
          paymentMethodMasked: parsed.paymentMethodMasked,
          tags: '',
          rawEmailSubject: email.subject,
          rawEmailSender: email.from,
          parserVersion: parsed.parserVersion,
          parsingConfidence: parsed.confidence,
          status,
          originalAmount: parsed.amountTotal,
          originalCurrency: parsed.currency,
          fxRate: fxData?.fxRate ?? null,
          fxRateDate: fxData?.fxRateDate ?? null,
          fxSource: fxData?.fxSource ?? null,
          markupPercent,
          convertedAmount: fxData?.convertedAmount ?? null,
          convertedCurrency: fxData ? targetCurrency : null,
          invoiceAmount: fxData?.finalAmount ?? null,
          invoiceCurrency: fxData ? targetCurrency : null,
          conversionStatus: fxData ? (fxData.fallbackUsed ? 'fallback' : 'converted') : 'failed',
          fallbackRateUsed: fxData?.fallbackUsed ?? false,
        },
      });

      newReceipts++;

      // Rate limiting: 100ms between fetches
      await new Promise((r) => setTimeout(r, 100));
    }

    // Update connected account
    await prisma.connectedEmailAccount.update({
      where: { id: emailAccount.id },
      data: {
        lastSyncAt: new Date(),
        totalImported: { increment: newReceipts },
        syncStatus: 'completed',
      },
    });

    return NextResponse.json({
      status: 'completed',
      newReceipts,
      totalScanned,
      message: `Sync complete. ${newReceipts} new receipts imported from ${totalScanned} emails scanned.`,
    });
  } catch (error) {
    await prisma.connectedEmailAccount.update({
      where: { id: emailAccount.id },
      data: { syncStatus: 'error' },
    });

    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
