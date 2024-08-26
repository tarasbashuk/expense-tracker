'use client';
import React, { useEffect, useState } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { PieValueType } from '@mui/x-charts';
import { TransactionType } from '@prisma/client';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

import MonthSelect from './shared/MonthSelect';
import TransactionTypeButtonGroup from './shared/TransactionTypeButtonGroup';
import { useMediaQueries } from '@/lib/useMediaQueries';
import getStats from '@/app/actions/getStats';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear();

const Stats = () => {
  const { isMobile } = useMediaQueries();
  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsloading] = useState(true);
  const [expenseChartData, setExpenseChartData] = useState<PieValueType[]>([]);
  const [incomeChartData, setIncomeChartData] = useState<PieValueType[]>([]);
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );

  useEffect(() => {
    const fetchTrans = async () => {
      const { expenseChartData, incomeChartData, error } = await getStats(
        currentYear,
        Number(month),
      );
      setExpenseChartData(expenseChartData || []);
      setIncomeChartData(incomeChartData || []);
      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();
  }, [month]);

  const chartData =
    transactionType === TransactionType.Expense
      ? expenseChartData
      : incomeChartData;

  if (error) {
    return (
      <Typography variant="h5" component="p" color="error" my="4">
        {error}
      </Typography>
    );
  }

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

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!isLoading && !!chartData.length ? (
        <PieChart
          slotProps={{
            legend: {
              direction: 'row',
              position: {
                vertical: isMobile ? 'middle' : 'top',
                horizontal: isMobile ? 'left' : 'middle',
              },
            },
          }}
          series={[
            {
              data: chartData,
              paddingAngle: 1,
              cornerRadius: 5,
              innerRadius: isMobile ? 10 : 30,
              outerRadius: isMobile ? 150 : 200,
              cx: isMobile ? '73%' : '57%',
              cy: isMobile ? '15%' : '50%',
            },
          ]}
          width={isMobile ? 320 : 900}
          height={isMobile ? 1150 : 650}
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
