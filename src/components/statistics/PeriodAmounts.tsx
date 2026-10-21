'use client';

import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import useAnalyticsCurrency from './useAnalyticsCurrency';
import { historyColors } from '../history/tokens';

export default function PeriodAmounts({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const { formatMessage } = useIntl();
  const money = useAnalyticsCurrency();
  const difference = income - expense;
  const amounts = [
    { id: 'incomeExpense.income', value: income, color: historyColors.income },
    {
      id: 'incomeExpense.expense',
      value: expense,
      color: historyColors.expense,
    },
    {
      id: 'home.net',
      value: difference,
      color:
        difference < 0 ? historyColors.negativeBalance : historyColors.income,
    },
  ];
  const columnWidth = Math.max(
    90,
    ...amounts.map(({ value }) => (money(value).length + 1) * 10),
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${columnWidth}px), 1fr))`,
        gap: 2,
      }}
    >
      {amounts.map(({ id, value, color }) => (
        <Box key={id} sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {formatMessage({ id })}
          </Typography>
          <Typography
            sx={{
              color,
              fontSize: { xs: 18, sm: 24 },
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              overflowWrap: 'anywhere',
            }}
          >
            {id === 'home.net' && value > 0 ? '+' : ''}
            {money(value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
