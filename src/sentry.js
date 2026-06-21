import * as Sentry from '@sentry/browser';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }
}
