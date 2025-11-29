import { withSentryConfig } from '@sentry/nextjs';

// Handle unhandled promise rejections from Sentry CLI to prevent build failures
if (typeof process !== 'undefined') {
  const originalUnhandledRejection = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', (reason, promise) => {
    // Check if this is a Sentry CLI error
    if (
      reason &&
      typeof reason === 'object' &&
      'cmd' in reason &&
      typeof reason.cmd === 'string' &&
      reason.cmd.includes('sentry-cli')
    ) {
      console.warn(
        '⚠️  Sentry CLI error detected:',
        reason.message || 'Unknown error',
      );
      console.warn(
        '⚠️  Build will continue without uploading source maps to Sentry',
      );

      // Don't throw - allow build to continue
      return;
    }
    // Re-emit other unhandled rejections
    originalUnhandledRejection.forEach((listener) => {
      listener(reason, promise);
    });
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Only upload source maps in CI/production and when Sentry auth token is available
// Can be disabled with SENTRY_DISABLE_SOURCE_MAPS=true to avoid build failures
const shouldUploadSourceMaps =
  !process.env.SENTRY_DISABLE_SOURCE_MAPS &&
  (process.env.CI ||
    (process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN));

const sentryConfig = shouldUploadSourceMaps
  ? {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      org: 'taras-bashuk',
      project: 'expense-tracker',

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Automatically annotate React components to show their full name in breadcrumbs and session replay
      reactComponentAnnotation: {
        enabled: true,
      },

      // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      // tunnelRoute: "/monitoring",

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Automatically delete source maps after upload (recommended for production)
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },

      // Don't fail build if source map upload fails (handles Sentry API downtime)
      errorHandler: (err, invokeErr, compilation) => {
        console.warn('⚠️  Sentry source map upload failed:', err.message);
        console.warn(
          '⚠️  Build will continue without uploading source maps to Sentry',
        );
        // Don't throw - allow build to continue
      },
    }
  : {
      // Disable source map upload for local builds
      sourcemaps: {
        disable: true,
      },
      silent: true,
    };

// Wrap withSentryConfig to catch any initialization errors
let config;
try {
  config = withSentryConfig(nextConfig, sentryConfig);
} catch (error) {
  console.warn('⚠️  Sentry configuration failed:', error.message);
  console.warn('⚠️  Continuing build without Sentry source map upload');
  config = nextConfig;
}

export default config;
