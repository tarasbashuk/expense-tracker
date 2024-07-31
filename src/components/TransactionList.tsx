'use client';
import { useEffect, useState } from 'react';
import getTransactions from '@/app/actions/getTransactions';
import TransactionItem from './TransactionItem';
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
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { MONTH_LIST } from '@/constants/constants';

const JANUARY = '0';
const DECEMBER = '11';
const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear();

const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsloading] = useState(false);

  const handleChange = (event: SelectChangeEvent) => {
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
  }, [month, currentYear]);

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
            onChange={handleChange}
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

      {isLoading && <CircularProgress />}

      {!transactions.length && !isLoading && (
        <Typography variant="h5" component="p" gutterBottom mt={4}>
          No records for selected period
        </Typography>
      )}

      <ul className="list">
        {transactions?.map((transaction: Transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </ul>
    </>
  );
};

export default TransactionList;
