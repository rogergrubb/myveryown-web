// ════════════════════════════════════════════════════════════════
// ANALYTICS — provider-agnostic event tracking shim
// ════════════════════════════════════════════════════════════════
// Fires `eventName` to whichever analytics provider is loaded on the
// page (if any). Today no provider is wired up — events fire as
// browser CustomEvents so they're observable in the console for
// debugging. The moment you add Vercel Analytics, Plausible, GA4,
// etc. via a script tag, this shim picks it up automatically with
// zero code changes.
//
// Supported auto-detection:
//   - Vercel Analytics     window.va('event', {name, ...props})
//   - Plausible             window.plausible(name, {props})
//   - Google Analytics 4    window.gtag('event', name, props)
//   - PostHog               window.posthog.capture(name, props)
//
// Usage:
//   import { track } from '@/lib/analytics';
//   track('persona_switch', { from: 'iron', to: 'hearth', count: 12 });
// ════════════════════════════════════════════════════════════════

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    va?: (event: string, payload: any) => void;
    plausible?: (name: string, opts?: { props?: Props }) => void;
    gtag?: (kind: string, name: string, props?: Props) => void;
    posthog?: { capture: (name: string, props?: Props) => void };
  }
}

export function track(eventName: string, props?: Props): void {
  if (typeof window === 'undefined') return;

  // Always emit a DOM event for debugging + future custom listeners
  try {
    window.dispatchEvent(new CustomEvent(`mvo:${eventName}`, { detail: props || {} }));
  } catch {
    /* ignore */
  }

  // Vercel Analytics (script tag injected by the user)
  if (typeof window.va === 'function') {
    try { window.va('event', { name: eventName, ...(props || {}) }); } catch {}
  }
  // Plausible
  if (typeof window.plausible === 'function') {
    try { window.plausible(eventName, props ? { props } : undefined); } catch {}
  }
  // Google Analytics 4
  if (typeof window.gtag === 'function') {
    try { window.gtag('event', eventName, props || {}); } catch {}
  }
  // PostHog
  if (window.posthog && typeof window.posthog.capture === 'function') {
    try { window.posthog.capture(eventName, props); } catch {}
  }

  // Dev visibility — always log in non-production builds
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', eventName, props ?? {});
  }
}

/** Convenience for the most common product event. */
export function trackPersonaSwitch(from: string, to: string, threadLength?: number) {
  track('persona_switch', {
    from,
    to,
    thread_length: threadLength ?? null,
  });
}

/** Track a user message send. */
export function trackMessageSent(persona: string, threadLength: number) {
  track('message_sent', { persona, thread_length: threadLength });
}

/** Track when the IntroTour is shown / dismissed. */
export function trackIntroTour(action: 'shown' | 'completed' | 'skipped', slideIndex?: number) {
  track('intro_tour', { action, slide_index: slideIndex ?? null });
}

/** Track when the persona picker bottom sheet is opened. */
export function trackPickerOpen(currentPersona: string) {
  track('persona_picker_open', { current_persona: currentPersona });
}


// ════════════════════════════════════════════════════════════════
// SERVER-SIDE VISIT BEACON
// ════════════════════════════════════════════════════════════════
// Fires a single non-blocking POST to /api/track/visit on each route
// mount. Server captures real IP + Vercel-injected geo and stores in
// the visits table. Client only sends what server can't see (path,
// persona, sessionId, referrer).
// ════════════════════════════════════════════════════════════════

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

export function trackVisit(meta: { path: string; persona?: string }): void {
  if (typeof window === 'undefined') return;
  let sessionId: string | undefined;
  try {
    sessionId = localStorage.getItem('mvo:sessionId') || undefined;
  } catch {}
  const body = JSON.stringify({
    path: meta.path,
    persona: meta.persona,
    sessionId,
    referrer: document.referrer || undefined,
  });
  // Prefer sendBeacon (fire-and-forget, queued by browser even on unload)
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/track/visit`, blob);
      return;
    }
  } catch {}
  // Fallback to fetch keepalive
  fetch(`${API_URL}/api/track/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { /* never block UX on analytics */ });
}
