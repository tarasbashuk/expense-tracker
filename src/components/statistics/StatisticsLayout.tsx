'use client';

import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import HistoryHeaderActions from '../history/HistoryHeaderActions';
import { pageHeaderStyles, pageStyles } from '../history/tokens';

export default function StatisticsLayout({
  titleId,
  children,
}: {
  titleId: string;
  children: ReactNode;
}) {
  const { formatMessage } = useIntl();

  return (
    <Box sx={{ ...pageStyles, maxWidth: '1000px', pb: 3 }}>
      <Box sx={pageHeaderStyles}>
        <Typography
          component="h1"
          sx={{ fontSize: { xs: 26, sm: 36 }, fontWeight: 700, minWidth: 0 }}
        >
          {formatMessage({ id: titleId })}
        </Typography>
        <HistoryHeaderActions />
      </Box>
      {children}
    </Box>
  );
}
