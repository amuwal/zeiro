import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@zeiro/core', '@zeiro/db', '@zeiro/email'],
  // Native / heavy server-only deps used by the knowledge + inbound attachment
  // extraction path (OCR, PDF, DOCX). Turbopack can't bundle @napi-rs/canvas's
  // native .node binding, so keep these external and require()'d at runtime.
  serverExternalPackages: ['@napi-rs/canvas', 'tesseract.js', 'unpdf', 'mammoth', 'sharp'],
};

export default withSentryConfig(config, {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  silent: !process.env.CI,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
});
