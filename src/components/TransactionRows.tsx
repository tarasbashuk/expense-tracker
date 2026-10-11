'use client';

import { Fragment, type ComponentProps } from 'react';
import { ListSubheader } from '@mui/material';
import { Transaction } from '@prisma/client';
import { useIntl } from 'react-intl';
import TransactionItem from './TransactionItem';
import { dateKeyFromLocalDate } from '@/lib/dateRange';
import { formatDate } from '@/lib/utils';
import { Locale } from '@/locales';

type Props = Omit<
  ComponentProps<typeof TransactionItem>,
  'transaction' | 'mobileGrouped'
> & {
  transactions: Transaction[];
};

export default function TransactionRows({ transactions, ...actions }: Props) {
  const { locale } = useIntl();

  return transactions.map((transaction, index) => {
    const dateKey = dateKeyFromLocalDate(new Date(transaction.date));
    const previous = transactions[index - 1];
    const startsDay =
      !previous || dateKeyFromLocalDate(new Date(previous.date)) !== dateKey;

    return (
      <Fragment key={transaction.id}>
        {startsDay && (
          <ListSubheader
            disableSticky
            sx={{
              display: { xs: 'block', sm: 'none' },
              px: 0,
              pt: 2,
              pb: 1,
              lineHeight: 1.5,
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            <time dateTime={dateKey}>
              {formatDate(transaction.date, locale as Locale)}
            </time>
          </ListSubheader>
        )}
        <TransactionItem transaction={transaction} mobileGrouped {...actions} />
      </Fragment>
    );
  });
}
