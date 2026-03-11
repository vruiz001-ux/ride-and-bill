import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Stripe webhook handler for subscription lifecycle events.
// Set STRIPE_WEBHOOK_SECRET in environment.

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  // Verify webhook signature
  // In production, use stripe.webhooks.constructEvent(body, signature, secret)
  // For now we parse directly — replace with proper Stripe SDK verification
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const obj = event.data.object;

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSubId = obj.id as string;
        const stripeCustomerId = obj.customer as string;
        const status = mapStripeStatus(obj.status as string);
        const plan = extractPlanFromSubscription(obj);
        const currentPeriodStart = new Date((obj.current_period_start as number) * 1000);
        const currentPeriodEnd = new Date((obj.current_period_end as number) * 1000);
        const cancelAtPeriodEnd = obj.cancel_at_period_end as boolean ?? false;
        const trialEnd = obj.trial_end ? new Date((obj.trial_end as number) * 1000) : null;

        // Find subscription by Stripe ID or customer ID
        const existing = await prisma.subscription.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: stripeSubId },
              { stripeCustomerId },
            ],
          },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan,
              status,
              stripeSubscriptionId: stripeSubId,
              stripeCustomerId,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd,
              trialEndsAt: trialEnd,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubId = obj.id as string;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubId },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'canceled',
              cancelAtPeriodEnd: false,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const stripeCustomerId = obj.customer as string;
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'past_due' },
          });
        }
        break;
      }

      case 'invoice.paid': {
        const stripeCustomerId = obj.customer as string;
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId },
        });
        if (sub && sub.status === 'past_due') {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'active' },
          });
        }
        break;
      }

      default:
        // Unhandled event type — log but don't error
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

function mapStripeStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };
  return map[stripeStatus] || 'active';
}

function extractPlanFromSubscription(sub: Record<string, unknown>): string {
  // Extract plan from Stripe subscription items metadata or price lookup key
  const items = sub.items as { data?: Array<{ price?: { lookup_key?: string; metadata?: Record<string, string> } }> } | undefined;
  const firstItem = items?.data?.[0];
  const lookupKey = firstItem?.price?.lookup_key;
  const planFromMeta = firstItem?.price?.metadata?.plan;

  if (planFromMeta) return planFromMeta;
  if (lookupKey) {
    // e.g. "solo_monthly", "pro_yearly"
    const planPart = lookupKey.split('_')[0];
    if (['free', 'solo', 'pro', 'team', 'custom'].includes(planPart)) {
      return planPart;
    }
  }
  return 'solo'; // default for unknown paid subscriptions
}
