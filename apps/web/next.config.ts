import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@zeiro/core', '@zeiro/db', '@zeiro/email'],
};

export default withSentryConfig(config, {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  silent: !process.env.CI,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
});
