'use client';
import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { messages } from '@/locales';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error cathed by the global-error.tsx', error);
    try {
      Sentry.withScope((scope) => {
        const w = typeof window !== 'undefined' ? (window as any) : undefined;
        const clerkUser = w?.Clerk?.user as
          | {
              id?: string;
              primaryEmailAddress?: { emailAddress?: string } | null;
              username?: string | null;
            }
          | undefined;
        const userId = clerkUser?.id;
        const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        const username = clerkUser?.username ?? undefined;
        const localeTag =
          (typeof document !== 'undefined'
            ? document.documentElement.lang
            : undefined) ||
          (typeof navigator !== 'undefined' ? navigator.language : undefined);

        scope.setTag('scope', 'global-error');
        scope.setTag(
          'path',
          typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        );
        if (localeTag) scope.setTag('locale', localeTag);
        scope.setLevel('error');

        if (userId || userEmail || username) {
          scope.setUser({ id: userId, email: userEmail, username });
        }

        scope.setExtras({
          digest: (error as any)?.digest,
          stack: error?.stack,
          name: error?.name,
          message: error?.message,
          href:
            typeof window !== 'undefined' ? window.location.href : undefined,
          search:
            typeof window !== 'undefined' ? window.location.search : undefined,
          hash:
            typeof window !== 'undefined' ? window.location.hash : undefined,
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          language:
            typeof navigator !== 'undefined' ? navigator.language : undefined,
          referrer:
            typeof document !== 'undefined' ? document.referrer : undefined,
          docLang:
            typeof document !== 'undefined'
              ? document.documentElement.lang
              : undefined,
          clerkUserPresent: Boolean(clerkUser),
          clerkUserId: userId,
          clerkUserEmail: userEmail,
          clerkUsername: username,
          timestamp: new Date().toISOString(),
        });

        Sentry.captureException(error);
      });
    } catch (_) {
      // ignore sentry failures
    }
  }, [error]);

  return (
    <html>
      <body>
        <IntlProvider
          locale="en-US"
          messages={messages['en-US']}
          defaultLocale="en-US"
        >
          <Box sx={{ p: 4 }}>
            <Typography gutterBottom variant="h3">
              <FormattedMessage
                id="error.title"
                defaultMessage="Oops, something went wrong! 🤷🏻‍♂️"
              />
            </Typography>

            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              <FormattedMessage
                id="error.reload"
                defaultMessage="Reload the page"
              />
            </Button>

            <Typography sx={{ paddingTop: 2 }} variant="body2">
              {JSON.stringify(error)}
            </Typography>
          </Box>
        </IntlProvider>
      </body>
    </html>
  );
}
