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
import MonthSelect from './shared/MonthSelect';
import TransactionsDataGrid from './TransactionsDataGrid';
import { ViewType } from '@/constants/types';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import getIncomeExpense from '@/app/actions/getIncomeExpense';

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
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [viewType, setViewType] = useState(ViewType.List);
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
      const { transactions, error } = await getTransactions(
        currentYear,
        Number(month),
      );
      const { income, expense } = await getIncomeExpense(
        currentYear,
        Number(month),
      );
      setIncome(income || 0);
      setExpense(expense || 0);
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

      {!isLoading && !!transactions.length && (
        <>
          <Box
            sx={{
              my: 1,
              px: 2,
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
