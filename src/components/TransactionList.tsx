'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Transaction } from '@prisma/client';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  CircularProgress,
  Stack,
  IconButton,
  List,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';

import TransactionItem from './TransactionItem';
import { DECEMBER, JANUARY, MONTH_LIST } from '@/constants/constants';
import getTransactions from '@/app/actions/getTransactions';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';

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

  const handleEditTransaction = (transactionId: string) => {
    setTransactionId(transactionId);
    setIsTransactionModalOpen(true);
  };
  const handleMonthChange = (event: SelectChangeEvent) => {
    setMonth(event.target.value);
  };

  const goToPrevMonth = () => {
    if (month === JANUARY) {
      setMonth(DECEMBER);
    } else {
      const prevMonth = Number(month) - 1;
      setMonth(prevMonth.toString());
    }
  };

  const goToNextMonth = () => {
    if (month === DECEMBER) {
      setMonth(JANUARY);
    } else {
      const nextMonth = Number(month) + 1;
      setMonth(nextMonth.toString());
    }
  };

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

  const handleDeleteTransaction = async (transactionId: string) => {
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
  };

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
      <Stack direction="row" alignItems="center">
        <IconButton
          aria-label="previous"
          onClick={goToPrevMonth}
          sx={{ marginRight: 2 }}
        >
          <ArrowBack />
        </IconButton>
        <FormControl variant="standard" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="month-select-label">Month</InputLabel>
          <Select
            labelId="month-select-label"
            id="month-select"
            value={month}
            onChange={handleMonthChange}
            label="Month"
          >
            {MONTH_LIST.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          aria-label="next"
          onClick={goToNextMonth}
          sx={{ marginLeft: 2 }}
        >
          <ArrowForward />
        </IconButton>
      </Stack>

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!transactions.length && !isLoading && (
        <Typography variant="h5" component="p" gutterBottom mt={4}>
          No records for selected period
        </Typography>
      )}

      {!isLoading && (
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
      )}
    </>
  );
};

export default TransactionList;
