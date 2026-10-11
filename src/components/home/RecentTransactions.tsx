'use client';

import { Transaction } from '@prisma/client';
import { Box, Button, List, Typography } from '@mui/material';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NavigationPath } from '@/constants/types';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import TransactionRows from '@/components/TransactionRows';
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
    <Box component="section" sx={{ minWidth: 0, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography variant="h6" component="h2" fontWeight={600}>
          {formatMessage({
            id: 'home.recentTransactions',
            defaultMessage: 'Recent transactions',
          })}
        </Typography>
        <Button
          component={Link}
          href={NavigationPath.Transactions}
          endIcon={<ArrowRight size={18} />}
          sx={{ flexShrink: 0, textTransform: 'none', minHeight: 44 }}
        >
          {formatMessage({ id: 'home.allTransactions', defaultMessage: 'All' })}
        </Button>
      </Box>

      {!transactions.length ? (
        <Typography color="text.secondary" mt={2}>
          {formatMessage({
            id: 'home.noRecentTransactions',
            defaultMessage: 'No transactions yet',
          })}
        </Typography>
      ) : (
        <List disablePadding sx={{ '& > li > h3': { pl: 1.25 } }}>
          <TransactionRows
            transactions={transactions}
            handleEdit={(id) => openTransaction(id, false)}
            handleCopy={(id) => openTransaction(id, true)}
            handleDelete={handleDelete}
          />
        </List>
      )}
    </Box>
  );
}
