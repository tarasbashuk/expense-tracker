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
import { YEAR_LIST } from '@/constants/constants';
import { getYearlyStats } from '@/app/actions/getYearlyStats';
import { MONTH_LIST } from '@/constants/constants';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { getYearlyChartDims } from '@/lib/getYearlyChartDims';
import MobileWarning from '@/components/shared/MobileWarning';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';

const CURRENT_YEAR = new Date().getFullYear();

const YearlyStatsContent = () => {
  const { isExtraSmall, isSmall, isMedium } = useMediaQueries();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomeData, setIncomeData] = useState<number[]>([]);
  const [expenseData, setExpenseData] = useState<number[]>([]);

  const { width, height, margin } = getYearlyChartDims({
    isExtraSmall,
    isSmall,
    isMedium,
  });

  useEffect(() => {
    const fetchYearlyData = async () => {
      setIsLoading(true);
      setError(null);
      setIncomeData([]);
      setExpenseData([]);

      const response = await getYearlyStats(year);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setIncomeData(response.data.monthlyIncome);
        setExpenseData(response.data.monthlyExpense);
      }

      setIsLoading(false);
    };
    fetchYearlyData();
  }, [year]);

  const hasAnyData =
    incomeData.some((v) => v !== 0) || expenseData.some((v) => v !== 0);

  const seriesForChart = hasAnyData
    ? [
        { data: incomeData, label: 'Income', color: '#4CAF50' },
        { data: expenseData, label: 'Expense', color: '#2196F3' },
      ]
    : [];

  return (
    <Stack alignItems="center" spacing={3} sx={{ mt: 4 }}>
      <MobileWarning />
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

      {error && (
        <Typography color="error" sx={{ textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <AdditionalBalanceInfo
        income={Math.round(incomeData.reduce((acc, curr) => acc + curr, 0))}
        expense={Math.round(expenseData.reduce((acc, curr) => acc + curr, 0))}
        sx={{ alignSelf: 'flex-start' }}
      />

      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          minHeight: 400,
          position: 'relative',
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
            '&:hover': {
              background: '#555',
            },
          },
        }}
      >
        <BarChart
          loading={isLoading}
          series={seriesForChart}
          xAxis={[
            {
              data: MONTH_LIST.map((m) => m.label),
              scaleType: 'band',
              tickLabelStyle: {
                angle: isExtraSmall || isSmall ? -45 : 45,
                textAnchor: isExtraSmall || isSmall ? 'end' : 'start',
                fontSize: isExtraSmall || isSmall ? 10 : 12,
              },
            },
          ]}
          width={width}
          height={height}
          margin={margin}
          slotProps={{
            noDataOverlay: { message: 'No data for selected year' },
            legend: {
              direction: 'row',
              position: { vertical: 'top', horizontal: 'middle' },
              padding: 0,
            },
          }}
        />
      </Box>
    </Stack>
  );
};

export default YearlyStatsContent;
