'use client';
import React, { useEffect, useState } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Stack, Typography } from '@mui/material';
import MonthSelect from './MonthSelect';
import { Transaction, TransactionType } from '@prisma/client';
import getTransactions from '@/app/actions/getTransactions';
import {
  convertToChartData,
  groupTransactionsByCategory,
} from '@/lib/pieChartUtils';
import TransactionTypeButtonGroup from './TransactionTypeButtonGroup';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear();

const Stats = () => {
  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsloading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );

  const groupedExpenses = groupTransactionsByCategory(
    transactions,
    transactionType,
  );
  const expenseChartData = convertToChartData(groupedExpenses);

  const sortedChartData = expenseChartData.sort(
    (c1, c2) => c2.value - c1.value,
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

  return (
    <Stack direction="column" alignItems="center">
      <Box sx={{ width: 'fit-content', marginBottom: 2 }}>
        <MonthSelect
          month={month}
          setMonth={setMonth}
          sx={{ marginBottom: 3 }}
        />
        <TransactionTypeButtonGroup
          transactionType={transactionType}
          setTranasctionType={setTranasctionType}
        />
      </Box>

      {!isLoading && !!transactions.length ? (
        <PieChart
          slotProps={{
            legend: {
              direction: 'row',
              position: { vertical: 'top', horizontal: 'middle' },
            },
          }}
          series={[
            {
              data: sortedChartData,
              innerRadius: 30,
              outerRadius: 200,
              paddingAngle: 1,
              cornerRadius: 5,
            },
          ]}
          width={900}
          height={650}
        />
      ) : (
        !isLoading && (
          <Typography variant="h6" color="textSecondary">
            No transactions available for the selected month.
          </Typography>
        )
      )}
    </Stack>
  );
};

export default Stats;
