'use client';

import { ReactNode } from 'react';
import { Box, IconButton } from '@mui/material';
import { useIntl } from 'react-intl';
import { ArrowBackIosNew, ArrowForwardIos } from './icons';

export const periodCellStyles = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '12px',
  bgcolor: 'background.paper',
  color: 'text.primary',
};

export default function PeriodNavigation({
  children,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  styled = false,
  toolbarGrid = false,
}: {
  children: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  styled?: boolean;
  toolbarGrid?: boolean;
}) {
  const { formatMessage } = useIntl();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '44px minmax(0, 1fr) 44px',
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        flex: 1,
        ...(styled && { gap: 1 }),
        ...(toolbarGrid && {
          gridColumn: 2,
          gridRow: 1,
          justifySelf: 'end',
          maxWidth: 360,
        }),
      }}
    >
      <IconButton
        aria-label={formatMessage({ id: 'filters.previousPeriod' })}
        onClick={onPrevious}
        disabled={previousDisabled}
        sx={{ width: 44, height: 44, ...(styled && periodCellStyles) }}
      >
        <ArrowBackIosNew fontSize="small" />
      </IconButton>
      {children}
      <IconButton
        aria-label={formatMessage({ id: 'filters.nextPeriod' })}
        onClick={onNext}
        disabled={nextDisabled}
        sx={{ width: 44, height: 44, ...(styled && periodCellStyles) }}
      >
        <ArrowForwardIos fontSize="small" />
      </IconButton>
    </Box>
  );
}
