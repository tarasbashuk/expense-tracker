'use client';

import { useState } from 'react';
import { Box, Chip, FormControlLabel, Switch, SxProps } from '@mui/material';
import { useIntl } from 'react-intl';
import PeriodAmounts from './statistics/PeriodAmounts';
import { cardStyles } from './history/tokens';
import { LoadingPlaceholder } from './history/TransactionSkeleton';

export default function AdditionalBalanceInfo({
  income,
  expense,
  sx,
  loading = false,
  incomplete = false,
}: {
  income: number;
  expense: number;
  sx?: SxProps;
  loading?: boolean;
  incomplete?: boolean;
}) {
  const [isInfoShown, setIsInfoShown] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <Box sx={sx}>
      <FormControlLabel
        control={
          <Switch
            checked={isInfoShown}
            onChange={(event) => setIsInfoShown(event.target.checked)}
          />
        }
        label={formatMessage({ id: 'balance.showInfo' })}
      />
      {isInfoShown && (
        <Box sx={{ ...cardStyles, p: { xs: 2, sm: 3 }, mt: 1 }}>
          {loading ? (
            <LoadingPlaceholder height={60} />
          ) : (
            <PeriodAmounts income={income} expense={expense} />
          )}
          {incomplete && (
            <Chip
              size="small"
              label={formatMessage({ id: 'stats.incompleteMonth' })}
              sx={{ mt: 2 }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
