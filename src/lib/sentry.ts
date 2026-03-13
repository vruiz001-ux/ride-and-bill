// Sentry error monitoring — lazy-loaded, only when DSN is configured
// Install @sentry/nextjs and set NEXT_PUBLIC_SENTRY_DSN to enable

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (SENTRY_DSN && typeof window !== 'undefined') {
    // Sentry will be loaded via CDN script if configured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = (window as any).Sentry;
    if (Sentry) {
      if (context) Sentry.setContext('extra', context);
      Sentry.captureException(error);
      return;
    }
  }
  console.error(error);
}
