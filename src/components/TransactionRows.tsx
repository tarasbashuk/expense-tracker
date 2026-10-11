'use client';

import { type ComponentProps } from 'react';
import { Box, List, Typography } from '@mui/material';
import { Transaction } from '@/lib/tags';
import { useIntl } from 'react-intl';
import TransactionItem from './TransactionItem';
import { dateKeyFromLocalDate } from '@/lib/dateRange';
import { cardRadius, historyColors } from './history/tokens';

type Props = Omit<
  ComponentProps<typeof TransactionItem>,
  'transaction' | 'mobileGrouped' | 'tags'
> & {
  transactions: Transaction[];
  stickyDates?: boolean;
};

export default function TransactionRows({
  transactions,
  stickyDates = false,
  ...actions
}: Props) {
  const { locale } = useIntl();
  const groups: { dateKey: string; date: Date; transactions: Transaction[] }[] =
    [];

  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    const dateKey = dateKeyFromLocalDate(date);
    const previous = groups[groups.length - 1];

    if (previous?.dateKey === dateKey) {
      previous.transactions.push(transaction);
    } else {
      groups.push({ dateKey, date, transactions: [transaction] });
    }
  }

  return groups.map((group) => (
    <Box
      component="li"
      key={group.transactions[0].id}
      sx={{
        listStyle: 'none',
        display: 'block',
        mb: 1.5,
      }}
    >
      <Typography
        component="h3"
        sx={{
          position: { xs: stickyDates ? 'sticky' : 'static', sm: 'static' },
          top: 'var(--page-header-height)',
          zIndex: 1,
          bgcolor: historyColors.background,
          py: 1.25,
          m: 0,
          fontSize: 14,
          lineHeight: 1.5,
          fontWeight: 600,
          color: historyColors.text,
        }}
      >
        <time dateTime={group.dateKey}>
          {new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(group.date)}
        </time>
      </Typography>
      <List
        disablePadding
        sx={{
          display: 'block',
          bgcolor: historyColors.card,
          borderRadius: cardRadius,
          '& > li:not(:last-child)': {
            borderBottom: `1px solid ${historyColors.divider}`,
          },
        }}
      >
        {group.transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            mobileGrouped
            {...actions}
          />
        ))}
      </List>
    </Box>
  ));
}
