/**
 * Web Vitals → Sentry Performance
 *
 * Captures Core Web Vitals (LCP, FID/INP, CLS, TTFB, FCP) and forwards them
 * to Sentry as custom measurements so they appear in the Performance tab.
 *
 * Usage: import './utils/vitals' once in main.jsx (side-effect import).
 */
import * as Sentry from '@sentry/react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/**
 * Thresholds per Google's Web Vitals spec (2024):
 *   LCP  : good < 2.5s   | needs improvement < 4s
 *   INP  : good < 200ms  | needs improvement < 500ms
 *   CLS  : good < 0.1    | needs improvement < 0.25
 *   FCP  : good < 1.8s   | needs improvement < 3s
 *   TTFB : good < 800ms  | needs improvement < 1.8s
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name, value) {
  const t = THRESHOLDS[name];
  if (!t) return 'unknown';
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function sendToSentry(metric) {
  const { name, value, id, rating } = metric;

  // Set as a Sentry custom measurement on the active transaction
  Sentry.setMeasurement(name, value, name === 'CLS' ? '' : 'millisecond');

  // Also add breadcrumb for easy debugging in Sentry issues
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${name}: ${value.toFixed(2)} (${rating})`,
    level: rating === 'poor' ? 'warning' : 'info',
    data: { name, value, id, rating },
  });

  // Log to console in development for local baseline capture
  if (import.meta.env.DEV) {
    const emoji = rating === 'good' ? '✅' : rating === 'poor' ? '🔴' : '🟡';
    console.log(`[Web Vitals] ${emoji} ${name}: ${value.toFixed(2)} ms (${rating})`);
  }
}

// Register all Core Web Vitals observers
onLCP(sendToSentry);
onINP(sendToSentry); // INP replaces FID as of 2024
onCLS(sendToSentry);
onFCP(sendToSentry);
onTTFB(sendToSentry);

export { getRating };
