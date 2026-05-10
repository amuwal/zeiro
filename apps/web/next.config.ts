import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@zeiro/core', '@zeiro/db', '@zeiro/email'],
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  widenClientFileUpload: true,
});
