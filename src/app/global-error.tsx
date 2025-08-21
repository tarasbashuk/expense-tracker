'use client';
import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useIntl } from 'react-intl';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { formatMessage } = useIntl();

  useEffect(() => {
    console.error('Error cathed by the global-error.tsx', error);
  }, [error]);

  return (
    <html>
      <body>
        <Box sx={{ p: 4 }}>
          <Typography gutterBottom variant="h3">
            {formatMessage({
              id: 'error.title',
              defaultMessage: 'Oops, something went wrong! 🤷🏻‍♂️',
            })}
          </Typography>

          <Button variant="contained" onClick={() => window.location.reload()}>
            {formatMessage({
              id: 'error.reload',
              defaultMessage: 'Reload the page',
            })}
          </Button>

          <Typography sx={{ paddingTop: 2 }} variant="body2">
            {JSON.stringify(error)}
          </Typography>
        </Box>
      </body>
    </html>
  );
}
