import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { searchReceiptEmails, fetchEmail } from '@/lib/services/gmail';
import { searchOutlookReceiptEmails, fetchOutlookEmail } from '@/lib/services/outlook';
import { isUberReceipt, parseUberReceipt } from '@/lib/parsers/uber';
import { isBoltReceipt, parseBoltReceipt } from '@/lib/parsers/bolt';
import { isWaymoReceipt, parseWaymoReceipt } from '@/lib/parsers/waymo';
import { isCareemReceipt, parseCareemReceipt } from '@/lib/parsers/careem';
import { isFreeNowReceipt, parseFreeNowReceipt } from '@/lib/parsers/freenow';
import { convertAmount } from '@/lib/services/fx';
import { rateLimit } from '@/lib/rate-limit';
import { getUserEntitlements, checkCanSync, resolveUserWorkspace } from '@/lib/services/entitlements';
import { checkReceiptQuota, incrementUsage, getBillingPeriod } from '@/lib/services/usage';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // Rate limit: 10 syncs per minute per user
  if (!rateLimit(`sync:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many sync requests. Please wait a moment.' }, { status: 429 });
  }

  // Parse optional month/year/provider filters from request body
  let month: number | undefined;
  let year: number | undefined;
  let emailProvider: string | undefined;
  try {
    const body = await request.json();
    if (body.month) month = parseInt(body.month);
    if (body.year) year = parseInt(body.year);
    if (body.provider) emailProvider = body.provider;
  } catch {
    // No body or invalid JSON — sync all
  }

  if (month !== undefined && (month < 1 || month > 12 || isNaN(month))) month = undefined;
  if (month && !year) year = new Date().getFullYear();

  const syncProvider = (emailProvider || 'gmail') as 'gmail' | 'outlook';

  // ─── Entitlement checks ──────────────────────────────────────────────────
  const entitlements = await getUserEntitlements(userId);
  const workspaceId = entitlements.workspaceId;

  const syncError = checkCanSync(entitlements, syncProvider);
  if (syncError) {
    return NextResponse.json({ error: syncError.message, code: syncError.code }, { status: 403 });
  }

  // Check receipt quota before starting
  const subscription = await prisma.subscription.findUnique({ where: { workspaceId } });
  const anchor = subscription?.billingCycleAnchor ?? new Date();
  const { start: periodStart, end: periodEnd } = getBillingPeriod(anchor);
  const quota = await checkReceiptQuota(workspaceId, entitlements.maxReceiptsPerMonth, periodStart, periodEnd);

  if (!quota.allowed) {
    return NextResponse.json({
      error: `Monthly receipt limit reached (${quota.current}/${quota.limit}). Upgrade your plan for more receipts.`,
      code: 'RECEIPT_LIMIT_REACHED',
      current: quota.current,
      limit: quota.limit,
    }, { status: 403 });
  }

  // Find or create connected email account record
  let emailAccount = await prisma.connectedEmailAccount.findFirst({
    where: { userId, provider: syncProvider },
  });

  if (!emailAccount) {
    const oauthProvider = syncProvider === 'outlook' ? 'azure-ad' : 'google';
    const oauthAccount = await prisma.account.findFirst({
      where: { userId, provider: oauthProvider },
    });
    if (!oauthAccount) {
      return NextResponse.json({ error: `No ${syncProvider} account connected` }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    emailAccount = await prisma.connectedEmailAccount.create({
      data: {
        userId,
        workspaceId,
        provider: syncProvider,
        email: user?.email || 'unknown',
        status: 'active',
      },
    });
  }

  await prisma.connectedEmailAccount.update({
    where: { id: emailAccount.id },
    data: { syncStatus: 'syncing' },
  });

  // Create sync run record
  const syncRun = await prisma.syncRun.create({
    data: {
      workspaceId,
      emailAccountId: emailAccount.id,
      status: 'running',
    },
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const targetCurrency = user?.defaultCurrency || 'EUR';
    const markupPercent = user?.defaultMarkupPercent ?? 5;

    // Build date range for search
    let afterDate: string | undefined;
    let beforeDate: string | undefined;

    if (year && month) {
      const lastDayPrevMonth = new Date(year, month - 1, 0);
      afterDate = `${lastDayPrevMonth.getFullYear()}/${String(lastDayPrevMonth.getMonth() + 1).padStart(2, '0')}/${String(lastDayPrevMonth.getDate()).padStart(2, '0')}`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      beforeDate = `${nextYear}/${String(nextMonth).padStart(2, '0')}/01`;
    } else if (year) {
      afterDate = `${year - 1}/12/31`;
      beforeDate = `${year + 1}/01/01`;
    } else if (!month && !year) {
      if (emailAccount.lastSyncAt) {
        afterDate = emailAccount.lastSyncAt.toISOString().split('T')[0].replace(/-/g, '/');
      }
    }

    const messageIds = syncProvider === 'outlook'
      ? await searchOutlookReceiptEmails(userId, afterDate, beforeDate)
      : await searchReceiptEmails(userId, afterDate, beforeDate);

    let newReceipts = 0;
    let skipped = 0;
    let totalScanned = 0;
    let errors = 0;

    for (const messageId of messageIds) {
      totalScanned++;

      // Re-check quota during sync (stop gracefully when limit hit)
      const currentQuota = await checkReceiptQuota(workspaceId, entitlements.maxReceiptsPerMonth, periodStart, periodEnd);
      if (!currentQuota.allowed) {
        break; // Stop gracefully, don't fail entire sync
      }

      // Check for duplicate (deduplication by sourceMessageId)
      const existing = await prisma.receipt.findUnique({
        where: { sourceMessageId: messageId },
      });
      if (existing) {
        skipped++;
        continue;
      }

      try {
        const email = syncProvider === 'outlook'
          ? await fetchOutlookEmail(userId, messageId)
          : await fetchEmail(userId, messageId);

        // Detect provider and parse
        let parsed = null;
        if (isUberReceipt(email)) {
          parsed = parseUberReceipt(email);
        } else if (isBoltReceipt(email)) {
          parsed = parseBoltReceipt(email);
        } else if (isWaymoReceipt(email)) {
          parsed = parseWaymoReceipt(email);
        } else if (isCareemReceipt(email)) {
          parsed = parseCareemReceipt(email);
        } else if (isFreeNowReceipt(email)) {
          parsed = parseFreeNowReceipt(email);
        }

        if (!parsed) continue;

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

        const receipt = await prisma.receipt.create({
          data: {
            userId,
            workspaceId,
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

        // Increment usage counter (idempotent per receiptId)
        await incrementUsage(workspaceId, 'receipts_imported', periodStart, periodEnd, receipt.id);
        newReceipts++;
      } catch {
        errors++;
      }

      // Rate limiting between API calls
      await new Promise((r) => setTimeout(r, 100));
    }

    await prisma.connectedEmailAccount.update({
      where: { id: emailAccount.id },
      data: {
        lastSyncAt: new Date(),
        totalImported: { increment: newReceipts },
        syncStatus: 'completed',
      },
    });

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'completed',
        totalScanned,
        newReceipts,
        skipped,
        errors,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: 'completed',
      newReceipts,
      skipped,
      totalScanned,
      errors,
      message: `Sync complete. ${newReceipts} new receipts imported, ${skipped} duplicates skipped from ${totalScanned} emails.`,
    });
  } catch (error) {
    await prisma.connectedEmailAccount.update({
      where: { id: emailAccount.id },
      data: { syncStatus: 'error' },
    });

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
        completedAt: new Date(),
      },
    });

    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
