// Centralized analytics helpers for GA4 and Mixpanel
// All tracking is gated by environment variables

// ─── GA4 ─────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    mixpanel?: {
      track: (event: string, properties?: Record<string, unknown>) => void;
      identify: (id: string) => void;
      people: { set: (props: Record<string, unknown>) => void };
    };
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  // GA4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
  // Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track(eventName, params);
  }
}

// ─── Pre-defined events ─────────────────────────────────────────────────────

export const analytics = {
  // Conversion
  ctaClick: (cta: string) => trackEvent('cta_click', { cta_name: cta }),
  signupStart: () => trackEvent('signup_start'),
  signupComplete: () => trackEvent('signup_complete'),
  loginSuccess: () => trackEvent('login_success'),

  // Feature usage
  receiptSync: (provider: string) => trackEvent('receipt_sync', { provider }),
  exportCreated: (format: string) => trackEvent('export_created', { format }),
  billingEntityCreated: () => trackEvent('billing_entity_created'),

  // Onboarding
  onboardingStep: (step: string) => trackEvent('onboarding_step', { step }),
  inboxConnected: (provider: string) => trackEvent('inbox_connected', { provider }),

  // Pricing
  pricingViewed: () => trackEvent('pricing_viewed'),
  planSelected: (plan: string) => trackEvent('plan_selected', { plan }),

  // Engagement
  pageView: (page: string) => trackEvent('page_view', { page }),
  demoClicked: () => trackEvent('demo_clicked'),
};
