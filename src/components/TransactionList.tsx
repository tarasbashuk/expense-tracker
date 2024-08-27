'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Transaction } from '@prisma/client';
import { Typography, CircularProgress, List } from '@mui/material';

import TransactionItem from './TransactionItem';
import getTransactions from '@/app/actions/getTransactions';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';
import MonthSelect from './shared/MonthSelect';
import TransactionsDataGrid from './TransactionsDataGrid';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear();

const TransactionList = () => {
  const {
    transactions,
    setTransactions,
    setTransactionId,
    setIsTransactionModalOpen,
  } = useTransactions();
  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsloading] = useState(false);

  const handleEditTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
    },
    [setTransactionId, setIsTransactionModalOpen],
  );

  const handleDeleteTransaction = useCallback(
    async (transactionId: string) => {
      const confirmed = window.confirm(
        'Are you sure you want to delete this transaction?',
      );

      if (!confirmed) return;

      const { message, error } = await deleteTransaction(transactionId);

      if (error) {
        toast.error(error);
      }

      toast.success(message);
      setTransactions((prevTrans: Transaction[]) => {
        const updatedTransactions = prevTrans.filter(
          (trans) => trans.id !== transactionId,
        );

        return updatedTransactions;
      });
    },
    [setTransactions],
  );

  useEffect(() => {
    const fetchTrans = async () => {
      const { transactions, error } = await getTransactions(
        currentYear,
        Number(month),
      );
      setTransactions(transactions || []);
      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();
  }, [month, setTransactions]);

  if (error) {
    return (
      <Typography variant="h5" component="p" color="error" my="4">
        {error}
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h4" component="h3" gutterBottom>
        History
      </Typography>
      <MonthSelect month={month} setMonth={setMonth} />

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!transactions.length && !isLoading && (
        <Typography variant="h5" component="p" gutterBottom mt={4}>
          No records for selected period
        </Typography>
      )}

      {!isLoading && (
        <>
          <TransactionsDataGrid
            rows={transactions}
            handleEdit={handleEditTransaction}
            handleDelete={handleDeleteTransaction}
          />

          <List sx={{ mt: 4 }}>
            {transactions?.map((transaction: Transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                handleEdit={handleEditTransaction}
                handleDelete={handleDeleteTransaction}
              />
            ))}
          </List>
        </>
      )}
    </>
  );
};

export default TransactionList;
