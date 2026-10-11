'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cardStyles, historyColors } from '../history/tokens';
import { useIntl } from 'react-intl';

import { HomeMonthlySummary as Summary } from '@/app/actions/getHomeDashboard';
import { NavigationPath } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';

export default function HomeMonthlySummary({ summary }: { summary: Summary }) {
  const { formatMessage, locale } = useIntl();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const formattedAmounts = [summary.income, summary.expense, summary.net].map(
    (amount) => formatCurrency(amount, defaultCurrency),
  );
  const columnWidth = Math.max(
    90,
    ...formattedAmounts.map((amount) => amount.length * 11 + 12),
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
    new Date(),
  );
  const change = summary.expenseChangePercent;
  const isSpendingDown = change != null && change <= 0;

  return (
    <Card
      component={Link}
      href={NavigationPath.Transactions}
      aria-label={formatMessage({
        id: 'home.openMonthlyTransactions',
        defaultMessage: 'Open monthly transactions',
      })}
      sx={{
        ...cardStyles,
        minWidth: 0,
        width: '100%',
        color: 'inherit',
        display: 'block',
        overflowWrap: 'anywhere',
        textDecoration: 'none',
        transition: (theme) =>
          theme.transitions.create(['box-shadow', 'transform'], {
            duration: theme.transitions.duration.shortest,
          }),
        '&:hover': {
          bgcolor: '#FAFCFF',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          '&:last-child': { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          gap={1}
          mb={2}
        >
          <Typography variant="h6" component="h2" fontWeight={600}>
            {formatMessage({
              id: 'home.thisMonth',
              defaultMessage: 'This month',
            })}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ textTransform: 'capitalize' }}
          >
            {monthLabel}
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${columnWidth}px), 1fr))`,
            gap: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({
                id: 'incomeExpense.income',
                defaultMessage: 'Income',
              })}
            </Typography>
            <Typography variant="h6" color={historyColors.income}>
              {formatCurrency(summary.income, defaultCurrency)}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({
                id: 'incomeExpense.expense',
                defaultMessage: 'Expense',
              })}
            </Typography>
            <Typography variant="h6" color={historyColors.expense}>
              {formatCurrency(summary.expense, defaultCurrency)}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({ id: 'home.net', defaultMessage: 'Net' })}
            </Typography>
            <Typography
              variant="h6"
              color={
                summary.net >= 0
                  ? historyColors.income
                  : historyColors.negativeBalance
              }
            >
              {summary.net > 0 ? '+' : ''}
              {formatCurrency(summary.net, defaultCurrency)}
            </Typography>
          </Box>
        </Box>

        {change != null && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            mt={2}
            color={isSpendingDown ? 'success.main' : 'warning.main'}
          >
            {isSpendingDown ? (
              <TrendingDown size={20} />
            ) : (
              <TrendingUp size={20} />
            )}
            <Typography variant="body2">
              {formatMessage(
                {
                  id: 'home.expenseComparison',
                  defaultMessage:
                    '{percent}% {direction} in expenses than over the same period last month',
                },
                {
                  percent: Math.abs(change),
                  direction: formatMessage({
                    id: isSpendingDown ? 'home.less' : 'home.more',
                    defaultMessage: isSpendingDown ? 'less' : 'more',
                  }),
                },
              )}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
