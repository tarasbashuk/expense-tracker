'use client';
import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error cathed by the root error.tsx', error);
  }, [error]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography gutterBottom variant="h3">
        Oops, something went wrong! 🤷🏻‍♂️
      </Typography>

      <Button variant="contained" onClick={() => window.location.reload()}>
        Relaod the page
      </Button>

      <Typography sx={{ paddingTop: 2 }} variant="body2">
        {JSON.stringify(error)}
      </Typography>
    </Box>
  );
}
