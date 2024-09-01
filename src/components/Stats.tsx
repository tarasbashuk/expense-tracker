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
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import MobileWarning from './shared/MobileWarning';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear();

const getChartDims = ({
  isExtraSmall,
  isSmall,
  isMedium,
}: Record<string, boolean>) => {
  if (isExtraSmall) {
    return {
      width: 320,
      height: 350,
      innerRadius: 10,
      outerRadius: 150,
    };
  }

  if (isSmall) {
    return {
      width: 420,
      height: 420,
      innerRadius: 15,
      outerRadius: 180,
    };
  }

  if (isMedium) {
    return {
      cx: '20%',
      cy: '50%',
      width: 800,
      height: 450,
      innerRadius: 20,
      outerRadius: 140,
    };
  }

  return {
    cx: '25%',
    cy: '50%',
    width: 950,
    height: 450,
    innerRadius: 30,
    outerRadius: 200,
  };
};

const Stats = () => {
  const { isExtraSmall, isSmall, isMedium } = useMediaQueries();
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsloading] = useState(true);
  const [expenseChartData, setExpenseChartData] = useState<PieValueType[]>([]);
  const [incomeChartData, setIncomeChartData] = useState<PieValueType[]>([]);
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );

  const { cx, cy, width, height, innerRadius, outerRadius } = getChartDims({
    isExtraSmall,
    isSmall,
    isMedium,
  });

  useEffect(() => {
    const fetchTrans = async () => {
      const { expenseChartData, incomeChartData, error } = await getStats(
        currentYear,
        Number(month),
      );
      const { income, expense } = await getIncomeExpense(
        currentYear,
        Number(month),
      );
      setIncome(income || 0);
      setExpense(expense || 0);
      setExpenseChartData(expenseChartData || []);
      setIncomeChartData(incomeChartData || []);
      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();
  }, [month]);

  const expenseType = transactionType === TransactionType.Expense;

  const chartData = expenseType ? expenseChartData : incomeChartData;

  if (error) {
    return (
      <Typography variant="h5" component="p" color="error" my="4">
        {error}
      </Typography>
    );
  }

  return (
    <Stack direction="column" alignItems="center">
      <MobileWarning />
      <Box sx={{ width: 'fit-content', marginBottom: 2 }}>
        <MonthSelect
          month={month}
          setMonth={setMonth}
          sx={{ marginBottom: 3 }}
        />
        <TransactionTypeButtonGroup
          size="medium"
          transactionType={transactionType}
          setTranasctionType={setTranasctionType}
        />
      </Box>

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!isLoading && !!chartData.length ? (
        <Box>
          <AdditionalBalanceInfo income={income} expense={expense} />
          <PieChart
            margin={{ right: 3 }}
            slotProps={{
              legend: {
                hidden: isExtraSmall || isSmall,
                direction: 'column',
                position: {
                  vertical: 'top',
                  horizontal: 'right',
                },
              },
            }}
            series={[
              {
                cx,
                cy,
                innerRadius,
                outerRadius,
                data: chartData,
                paddingAngle: 1,
                cornerRadius: 5,
              },
            ]}
            width={width}
            height={height}
          />
        </Box>
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
