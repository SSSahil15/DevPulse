import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';

// Regex to detect token-shaped strings in breadcrumb data so we can redact them
// before they leave the browser. Matches JWTs and hex tokens (32+ chars).
const TOKEN_RE = /^(ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|[0-9a-f]{32,})$/;

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '', // Empty = Sentry disabled
  release: import.meta.env.VITE_SENTRY_RELEASE || 'devpulse-frontend@dev',
  environment: import.meta.env.PROD ? 'production' : 'development',

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text + block all media in replays to protect user PII
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Propagate trace headers to backend so frontend fetches appear as
  // child spans on backend Sentry transactions (distributed tracing).
  tracePropagationTargets: ['localhost', import.meta.env.VITE_API_URL].filter(Boolean),

  // Sampling: 10% of transactions and 5% of sessions in prod; 100% in dev
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0.1,
  // Always capture a replay when an error occurs
  replaysOnErrorSampleRate: 1.0,

  /**
   * beforeSend — strip credentials from request context before sending to Sentry.
   */
  beforeSend(event) {
    // Strip Authorization header
    const headers = event.request?.headers;
    if (headers) {
      if (headers['Authorization']) headers['Authorization'] = '[REDACTED]';
      if (headers['authorization']) headers['authorization'] = '[REDACTED]';
    }

    // Redact token-shaped strings in breadcrumb data (e.g. tokens logged accidentally)
    if (Array.isArray(event.breadcrumbs?.values)) {
      for (const crumb of event.breadcrumbs.values) {
        if (crumb.data && typeof crumb.data === 'object') {
          for (const [k, v] of Object.entries(crumb.data)) {
            if (typeof v === 'string' && TOKEN_RE.test(v)) {
              crumb.data[k] = '[REDACTED]';
            }
          }
        }
      }
    }

    return event;
  },
});

import App from './App';
import './styles.css';
import './utils/vitals'; // Core Web Vitals → Sentry (side-effect import)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
