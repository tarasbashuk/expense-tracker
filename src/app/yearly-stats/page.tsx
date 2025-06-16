'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { startOfYear, endOfYear, getMonth } from 'date-fns';
import getTransactions from '@/app/actions/getTransactions';
import { TransactionType } from '@prisma/client';
import { MONTH_LIST, YEAR_LIST } from '@/constants/constants';

const CURRENT_YEAR = Number(YEAR_LIST[0]);

const YearlyStatsContent = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [incomeData, setIncomeData] = useState<number[]>([]);
  const [expenseData, setExpenseData] = useState<number[]>([]);

  useEffect(() => {
    const fetchYearlyData = async () => {
      setIsLoading(true);
      setError('');
      // Clear previous data immediately for consistency
      setIncomeData([]);
      setExpenseData([]);

      try {
        const startDate = startOfYear(new Date(year, 0));
        const endDate = endOfYear(new Date(year, 11));
        const { transactions = [] } = await getTransactions(startDate, endDate);

        // Initialize 12-month arrays with zeros
        const monthlyIncomeTotals: number[] = new Array(12).fill(0);
        const monthlyExpenseTotals: number[] = new Array(12).fill(0);

        // Aggregate amounts per month
        transactions.forEach((transaction) => {
          const monthIndex = getMonth(new Date(transaction.date));
          if (transaction.type === TransactionType.Income) {
            monthlyIncomeTotals[monthIndex] +=
              transaction.amountDefaultCurrency;
          } else {
            monthlyExpenseTotals[monthIndex] +=
              transaction.amountDefaultCurrency;
          }
        });

        setIncomeData(monthlyIncomeTotals);
        setExpenseData(monthlyExpenseTotals);
      } catch (e) {
        // Show error message if fetch fails
        setError('Failed to load yearly stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchYearlyData();
  }, [year]);

  // Check if there's any non-zero data in income or expense
  const hasAnyData =
    incomeData.some((v) => v !== 0) || expenseData.some((v) => v !== 0);

  // Prepare series: empty array if no real data
  const seriesForChart = hasAnyData
    ? [
        { data: incomeData, label: 'Income', color: '#4CAF50' },
        { data: expenseData, label: 'Expense', color: '#2196F3' },
      ]
    : [];

  return (
    <Stack alignItems="center" spacing={3} sx={{ mt: 4 }}>
      <Typography variant="h4">Yearly Overview</Typography>
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel id="year-select-label">Year</InputLabel>
        <Select
          labelId="year-select-label"
          value={year}
          label="Year"
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEAR_LIST.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Display error message if any */}
      {error && <Typography color="error">{error}</Typography>}

      <Box sx={{ width: '100%', maxWidth: 900, minHeight: 400 }}>
        <BarChart
          // Let the chart show its built-in loading overlay when loading
          loading={isLoading}
          // Pass empty series if no data to trigger built-in "no data" overlay
          series={seriesForChart}
          xAxis={[
            {
              data: MONTH_LIST.map((m) => m.label),
              scaleType: 'band',
              tickLabelStyle: { angle: 45, textAnchor: 'start' },
            },
          ]}
          width={900}
          height={400}
          slotProps={{
            noDataOverlay: {
              message: 'No data for selected year',
            },
            loadingOverlay: {
              message: 'Loading data…',
            },
          }}
        />
      </Box>
    </Stack>
  );
};

export default YearlyStatsContent;
