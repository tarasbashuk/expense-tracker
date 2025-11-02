'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  Typography,
  Alert,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { Transaction } from '@prisma/client';
import getRecurringTransactions from '@/app/actions/getRecurringTransactions';
import TransactionItem from '@/components/TransactionItem';
import { formatCurrency } from '@/lib/formatCurrency';
import { red } from '@mui/material/colors';
import { Locale } from '@/locales';
import { useTransactions } from '@/context/TranasctionsContext';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { toast } from 'react-toastify';

const RecurringTransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { locale, formatMessage } = useIntl();
  const {
    setTransactionId,
    setIsTransactionModalOpen,
    isTransactionModalOpen,
    setTransactions: setContextTransactions,
    transactionId,
  } = useTransactions();

  // Track if modal was opened for editing (to refresh after save)
  const wasEditingRef = useRef(false);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const result = await getRecurringTransactions();

    if (result.error) {
      setError(result.error);
    } else {
      const fetchedTransactions = result.transactions || [];
      setTransactions(fetchedTransactions);
      // Update context so AddTransactionModal can find the transaction for editing
      setContextTransactions(fetchedTransactions);
      setTotalExpense(result.totalExpense || 0);
    }
    setIsLoading(false);
  }, [setContextTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Track when modal opens for editing
  useEffect(() => {
    if (isTransactionModalOpen && transactionId) {
      wasEditingRef.current = true;
    }
  }, [isTransactionModalOpen, transactionId]);

  // Refresh data when modal closes after editing
  useEffect(() => {
    if (!isTransactionModalOpen && wasEditingRef.current && transactions.length > 0) {
      // Modal was closed after editing, refresh data
      wasEditingRef.current = false;
      const timer = setTimeout(() => {
        fetchTransactions();
      }, 500); // Small delay to ensure save is complete

      return () => clearTimeout(timer);
    }

    if (!isTransactionModalOpen) {
      wasEditingRef.current = false;
    }
  }, [isTransactionModalOpen, fetchTransactions, transactions.length]);

  const handleEdit = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
    },
    [setTransactionId, setIsTransactionModalOpen],
  );

  const handleDelete = useCallback(
    async (transactionId: string) => {
      const confirmed = window.confirm(
        formatMessage({
          id: 'transactions.deleteConfirm',
          defaultMessage: 'Are you sure you want to delete this transaction?',
        }),
      );

      if (!confirmed) return;

      const { message, error } = await deleteTransaction(transactionId);

      if (error) {
        return toast.error(error);
      }

      toast.success(message);
      // Remove from local state
      setTransactions((prevTrans) =>
        prevTrans.filter((trans) => trans.id !== transactionId),
      );
      // Recalculate total
      setTotalExpense((prevTotal) => {
        const deletedTransaction = transactions.find((t) => t.id === transactionId);

        if (deletedTransaction?.amountDefaultCurrency) {
          return prevTotal - (deletedTransaction.amountDefaultCurrency as number);
        }

        return prevTotal;
      });
    },
    [setTransactions, formatMessage, transactions],
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <FormattedMessage
          id="recurring.error"
          defaultMessage="Error loading recurring transactions: {error}"
          values={{ error }}
        />
      </Alert>
    );
  }

  // Show current month since recurring transactions from last month will be created for current month
  const currentDate = new Date();

  // Format as "November, 2025" (month name + year)
  const currentMonthFormatted = new Intl.DateTimeFormat(
    locale === 'uk-UA' ? 'uk-UA' : 'en-US',
    { month: 'long', year: 'numeric' }
  ).format(currentDate);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <FormattedMessage
            id="recurring.title"
            defaultMessage="Recurring Transactions"
          />
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          <FormattedMessage
            id="recurring.description"
            defaultMessage="Expected transactions for {month}"
            values={{ month: currentMonthFormatted }}
          />
        </Typography>
      </Box>

      {transactions.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              <FormattedMessage
                id="recurring.noTransactions"
                defaultMessage="No recurring transactions found for the current period"
              />
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                  <FormattedMessage
                    id="recurring.totalExpense"
                    defaultMessage="Total Expenses"
                  />
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ color: red[500], fontWeight: 'bold' }}
                >
                  {formatCurrency(totalExpense)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FormattedMessage
                  id="recurring.transactions"
                  defaultMessage="Transactions ({count})"
                  values={{ count: transactions.length }}
                />
              </Typography>
              <List>
                {transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                  />
                ))}
              </List>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default RecurringTransactionsList;

