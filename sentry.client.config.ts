// This file configures the initialization of Sentry on the client side (browser).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
  integrations: [
    Sentry.replayIntegration(),
  ],
});
