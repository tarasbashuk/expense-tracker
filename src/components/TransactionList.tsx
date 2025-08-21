'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Transaction } from '@prisma/client';
import {
  Box,
  List,
  Typography,
  ToggleButton,
  CircularProgress,
  ToggleButtonGroup,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import TableViewIcon from '@mui/icons-material/TableView';

import TransactionItem from './TransactionItem';
import getTransactions from '@/app/actions/getTransactions';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';
import YearMonthSelect from './shared/YearMonthSelect';
import TransactionsDataGrid from './TransactionsDataGrid';
import { ViewType } from '@/constants/types';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import { getCheckSum } from '@/lib/utils';
import usePrevious from '@/lib/hooks/usePrevious';
import { useIntl } from 'react-intl';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear().toString();

const TransactionList = () => {
  const {
    transactions,
    setTransactions,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
  } = useTransactions();
  // Workoraund for re-fething expense/income data
  const checkSum = getCheckSum(transactions);
  const prevCheckSum = usePrevious(checkSum);

  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [viewType, setViewType] = useState(ViewType.List);
  const [isLoading, setIsloading] = useState(false);

  const { formatMessage } = useIntl();

  const handleEditTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
    },
    [setTransactionId, setIsTransactionModalOpen],
  );

  const handleCopyTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
      setIsCopyTransactionFlow(true);
    },
    [setTransactionId, setIsCopyTransactionFlow, setIsTransactionModalOpen],
  );

  const handleDeleteTransaction = useCallback(
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
    [setTransactions, formatMessage],
  );

  const handleTypeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newType: ViewType) => {
      // If a user click on already selected type button, the newType cames as null
      if (!newType) return;

      setViewType(newType);
    },
    [],
  );

  useEffect(() => {
    const fetchTrans = async () => {
      const startDate = new Date(Date.UTC(Number(year), Number(month), 1));
      const endDate = new Date(Date.UTC(Number(year), Number(month) + 1, 0));
      const { transactions, error } = await getTransactions(
        startDate,
        endDate,
        true,
      );

      setTransactions(transactions || []);
      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();
  }, [month, year, setTransactions]);

  useEffect(() => {
    const fetchIncomeExpense = async () => {
      const { income, expense } = await getIncomeExpense(
        Number(year),
        Number(month),
      );

      setIncome(income || 0);
      setExpense(expense || 0);
    };
    const shouldFetch = !!checkSum && checkSum !== prevCheckSum;

    if (shouldFetch) {
      fetchIncomeExpense();
    }
  }, [year, month, checkSum, prevCheckSum]);

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
        {formatMessage({ id: 'transactions.title', defaultMessage: 'History' })}
      </Typography>
      <YearMonthSelect
        year={year}
        month={month}
        setMonth={setMonth}
        setYear={setYear}
      />

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!transactions.length && !isLoading && (
        <Typography variant="h5" component="p" gutterBottom mt={4}>
          {formatMessage({
            id: 'transactions.noRecords',
            defaultMessage: 'No records for selected period',
          })}
        </Typography>
      )}

      {!isLoading && !!transactions.length && (
        <>
          <Box
            sx={{
              my: 1,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <AdditionalBalanceInfo
              income={income}
              expense={expense}
              sx={{ marginLeft: { xs: 0, md: 9, lg: 18 } }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={viewType}
              sx={{ ml: 'auto', height: 'fit-content' }}
              onChange={handleTypeChange}
            >
              <ToggleButton value={ViewType.List}>
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value={ViewType.Grid}>
                <TableViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewType === ViewType.Grid ? (
            <TransactionsDataGrid
              rows={transactions}
              handleEdit={handleEditTransaction}
              handleCopy={handleCopyTransaction}
              handleDelete={handleDeleteTransaction}
            />
          ) : (
            <List>
              {transactions?.map((transaction: Transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  handleEdit={handleEditTransaction}
                  handleDelete={handleDeleteTransaction}
                />
              ))}
            </List>
          )}
        </>
      )}
    </>
  );
};

export default TransactionList;
