'use client';

import Link from 'next/link';
import { ComponentPropsWithoutRef } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { rememberAnalyticsScroll } from '@/lib/hooks/useAnalyticsScrollRestore';

export default function AnalyticsHistoryLink({
  sx,
  onClick,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { sx?: SxProps<Theme> }) {
  return (
    <Box
      component={Link}
      {...props}
      onClick={(event) => {
        rememberAnalyticsScroll();
        onClick?.(event);
      }}
      sx={[
        {
          color: 'inherit',
          textDecoration: 'none',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
          '&:hover': { bgcolor: 'action.hover' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
