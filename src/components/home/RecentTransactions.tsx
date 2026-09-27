'use client';

import { Transaction } from '@prisma/client';
import { Card, CardContent, List, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import TransactionItem from '@/components/TransactionItem';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { formatMessage } = useIntl();
  const router = useRouter();
  const {
    setTransactions,
    setTransactionDraft,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
    requestTransactionsRefresh,
  } = useTransactions();

  const openTransaction = (id: string, copy: boolean) => {
    setTransactions(transactions);
    setTransactionDraft(null);
    setTransactionId(id);
    setIsCopyTransactionFlow(copy);
    setIsTransactionModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      formatMessage({
        id: 'transactions.deleteConfirm',
        defaultMessage: 'Are you sure you want to delete this transaction?',
      }),
    );

    if (!confirmed) return;

    const { message, error } = await deleteTransaction(id);

    if (error) {
      toast.error(error);

      return;
    }

    toast.success(message);
    setTransactions((current) => current.filter((item) => item.id !== id));
    requestTransactionsRefresh();
    router.refresh();
  };

  return (
    <Card sx={{ minWidth: 0, width: '100%' }}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          minWidth: 0,
          '&:last-child': { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Typography variant="h6">
          {formatMessage({
            id: 'home.recentTransactions',
            defaultMessage: 'Recent transactions',
          })}
        </Typography>

        {!transactions.length ? (
          <Typography color="text.secondary" mt={2}>
            {formatMessage({
              id: 'home.noRecentTransactions',
              defaultMessage: 'No transactions yet',
            })}
          </Typography>
        ) : (
          <List disablePadding>
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                handleEdit={(id) => openTransaction(id, false)}
                handleCopy={(id) => openTransaction(id, true)}
                handleDelete={handleDelete}
              />
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
