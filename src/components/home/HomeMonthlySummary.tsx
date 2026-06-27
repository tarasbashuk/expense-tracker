'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useIntl } from 'react-intl';

import { HomeMonthlySummary as Summary } from '@/app/actions/getHomeDashboard';
import { NavigationPath } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';

export default function HomeMonthlySummary({ summary }: { summary: Summary }) {
  const { formatMessage } = useIntl();
  const {
    settings: { defaultCurrency },
  } = useSettings();
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
        minWidth: 0,
        width: '100%',
        color: 'inherit',
        textDecoration: 'none',
        transition: (theme) =>
          theme.transitions.create(['box-shadow', 'transform'], {
            duration: theme.transitions.duration.shortest,
          }),
        '&:hover': {
          boxShadow: 4,
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
        <Typography variant="h6" gutterBottom>
          {formatMessage({
            id: 'home.thisMonth',
            defaultMessage: 'This month',
          })}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({
                id: 'incomeExpense.income',
                defaultMessage: 'Income',
              })}
            </Typography>
            <Typography variant="h6" color="success.main">
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
            <Typography variant="h6" color="error.main">
              {formatCurrency(summary.expense, defaultCurrency)}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({ id: 'home.net', defaultMessage: 'Net' })}
            </Typography>
            <Typography
              variant="h6"
              color={summary.net >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(summary.net, defaultCurrency)}
            </Typography>
          </Box>
        </Stack>

        {change != null && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            mt={2}
            color={isSpendingDown ? 'success.main' : 'warning.main'}
          >
            {isSpendingDown ? (
              <TrendingDownIcon fontSize="small" />
            ) : (
              <TrendingUpIcon fontSize="small" />
            )}
            <Typography variant="body2">
              {formatMessage(
                {
                  id: 'home.expenseComparison',
                  defaultMessage:
                    '{percent}% {direction} than last month in expenses',
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
