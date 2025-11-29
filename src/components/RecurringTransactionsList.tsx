'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  Typography,
  Alert,
} from '@mui/material';
import { red } from '@mui/material/colors';
import { FormattedMessage, useIntl } from 'react-intl';
import { Transaction } from '@prisma/client';

import getRecurringTransactions from '@/app/actions/getRecurringTransactions';
import getMonthlyForecast from '@/app/actions/getMonthlyForecast';
import TransactionItem from '@/components/TransactionItem';
import { formatCurrency } from '@/lib/formatCurrency';
import { useTransactions } from '@/context/TranasctionsContext';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import { Divider } from '@mui/material';

interface CategoryForecast {
  category: string;
  averageAmount: number;
}

const RecurringTransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [forecast, setForecast] = useState<{
    categoryForecasts: CategoryForecast[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { locale, formatMessage } = useIntl();
  const { isExtraSmall, isSmall } = useMediaQueries();
  const { getLabel } = useCategoryI18n();
  const {
    setTransactionId,
    setIsTransactionModalOpen,
    isTransactionModalOpen,
    setTransactions: setContextTransactions,
    transactionId,
  } = useTransactions();

  // Track if modal was opened for editing (to refresh after save)
  const wasEditingRef = useRef(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [transactionsResult, forecastResult] = await Promise.all([
      getRecurringTransactions(),
      getMonthlyForecast(),
    ]);

    if (transactionsResult.error) {
      setError(transactionsResult.error);
    } else {
      const fetchedTransactions = transactionsResult.transactions || [];
      setTransactions(fetchedTransactions);
      // Update context so AddTransactionModal can find the transaction for editing
      setContextTransactions(fetchedTransactions);
      setTotalExpense(transactionsResult.totalExpense || 0);
    }

    if (!forecastResult.error) {
      setForecast({
        categoryForecasts: forecastResult.categoryForecasts,
      });
    }

    setIsLoading(false);
  }, [setContextTransactions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track when modal opens for editing
  useEffect(() => {
    if (isTransactionModalOpen && transactionId) {
      wasEditingRef.current = true;
    }
  }, [isTransactionModalOpen, transactionId]);

  // Refresh data when modal closes after editing
  useEffect(() => {
    if (
      !isTransactionModalOpen &&
      wasEditingRef.current &&
      transactions.length > 0
    ) {
      // Modal was closed after editing, refresh data
      wasEditingRef.current = false;
      const timer = setTimeout(() => {
        fetchData();
      }, 500); // Small delay to ensure save is complete

      return () => clearTimeout(timer);
    }

    if (!isTransactionModalOpen) {
      wasEditingRef.current = false;
    }
  }, [isTransactionModalOpen, fetchData, transactions.length]);

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
        const deletedTransaction = transactions.find(
          (t) => t.id === transactionId,
        );

        if (deletedTransaction?.amountDefaultCurrency) {
          return (
            prevTotal - (deletedTransaction.amountDefaultCurrency as number)
          );
        }

        return prevTotal;
      });
    },
    [setTransactions, formatMessage, transactions],
  );

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
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

  const currentDate = new Date();

  const currentMonthFormatted = new Intl.DateTimeFormat(
    locale === 'uk-UA' ? 'uk-UA' : 'en-US',
    { month: 'long', year: 'numeric' },
  ).format(currentDate);

  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant={isExtraSmall || isSmall ? 'h5' : 'h4'}
          component="h1"
          gutterBottom
        >
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

      {/* Monthly Forecast Card */}
      {forecast && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FormattedMessage
                id="recurring.forecast.title"
                defaultMessage="Monthly Forecast"
              />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <FormattedMessage
                id="recurring.forecast.description"
                defaultMessage="Based on average spending over the last year"
              />
            </Typography>

            {/* Category forecasts */}
            {forecast.categoryForecasts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {forecast.categoryForecasts.map((item) => (
                  <Box
                    key={item.category}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ py: 0.5 }}
                  >
                    <Typography variant="body2">
                      {getLabel(item.category as any)}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(item.averageAmount)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Total forecast from categories */}
            {forecast.categoryForecasts.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 0.5 }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    <FormattedMessage
                      id="recurring.forecast.categoriesTotal"
                      defaultMessage="Total Forecast"
                    />
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(
                      forecast.categoryForecasts.reduce(
                        (sum, item) => sum + item.averageAmount,
                        0,
                      ),
                    )}
                  </Typography>
                </Box>
              </>
            )}

            {/* Recurring total */}
            {totalExpense > 0 && (
              <>
                {forecast.categoryForecasts.length > 0 && <Divider sx={{ my: 1 }} />}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 0.5 }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    <FormattedMessage
                      id="recurring.forecast.recurring"
                      defaultMessage="Recurring Transactions"
                    />
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(totalExpense)}
                  </Typography>
                </Box>
              </>
            )}

            {/* Total forecast */}
            {forecast.categoryForecasts.length > 0 || totalExpense > 0 ? (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6">
                    <FormattedMessage
                      id="recurring.forecast.total"
                      defaultMessage="Total"
                    />
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: red[500], fontWeight: 'bold' }}
                  >
                    {formatCurrency(
                      forecast.categoryForecasts.reduce(
                        (sum, item) => sum + item.averageAmount,
                        0,
                      ) + totalExpense,
                    )}
                  </Typography>
                </Box>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

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

              <Box
                sx={{ mt: 3 }}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">
                  <FormattedMessage
                    id="recurring.totalExpense"
                    defaultMessage="Total Recurring expensess"
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
        </>
      )}
    </Box>
  );
};

export default RecurringTransactionsList;
