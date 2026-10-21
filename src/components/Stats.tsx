'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { PieValueType } from '@mui/x-charts';
import { TransactionType } from '@prisma/client';
import { useIntl } from 'react-intl';
import { BarChartIcon, PieChartIcon } from './shared/icons';
import StatisticsPeriodNavigation from './statistics/StatisticsPeriodNavigation';
import CategoryBreakdown from './statistics/CategoryBreakdown';
import useAnalyticsCurrency from './statistics/useAnalyticsCurrency';
import TransactionTypeButtonGroup from './shared/TransactionTypeButtonGroup';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import TransactionSkeleton from './history/TransactionSkeleton';
import { cardStyles } from './history/tokens';
import StatisticsLayout from './statistics/StatisticsLayout';
import getStats from '@/app/actions/getStats';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import { ChartType, TransactionCategory } from '@/constants/types';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import { COLOR_MAP } from '@/lib/getCategoryColor';

export default function Stats() {
  const money = useAnalyticsCurrency();
  const { formatMessage } = useIntl();
  const { getLabel } = useCategoryI18n();
  const [month, setMonth] = useState(() => String(new Date().getMonth()));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [expenseData, setExpenseData] = useState<PieValueType[]>([]);
  const [incomeData, setIncomeData] = useState<PieValueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setActiveCategory(null);

    const fetchData = async () => {
      try {
        const [stats, totals] = await Promise.all([
          getStats(Number(year), Number(month)),
          getIncomeExpense(Number(year), Number(month)),
        ]);

        if (cancelled) {
          return;
        }

        setIncome(totals.income ?? 0);
        setExpense(totals.expense ?? 0);
        setExpenseData(stats.expenseChartData ?? []);
        setIncomeData(stats.incomeChartData ?? []);
        setError(stats.error || totals.error || '');
      } catch {
        if (!cancelled) {
          setError(formatMessage({ id: 'stats.loadError' }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [year, month, formatMessage]);

  const isExpense = transactionType === TransactionType.Expense;
  const chartData = [...(isExpense ? expenseData : incomeData)]
    .sort((a, b) => b.value - a.value)
    .map((item) => {
      const category = String(item.label);

      return {
        ...item,
        id: category,
        category,
        label: getLabel(category as TransactionCategory),
        color: COLOR_MAP[category as TransactionCategory] ?? COLOR_MAP.others,
      };
    });
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeIndex = chartData.findIndex(
    (item) => item.category === activeCategory,
  );
  const now = new Date();
  const incomplete =
    Number(year) === now.getFullYear() && Number(month) === now.getMonth();
  const heading = formatMessage({
    id: isExpense ? 'stats.expenseCategories' : 'stats.incomeCategories',
  });

  return (
    <StatisticsLayout titleId="navigation.stats">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
        >
          <Stack gap={1} sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
            <StatisticsPeriodNavigation
              year={Number(year)}
              month={Number(month)}
              onChange={(date) => {
                setYear(String(date.getFullYear()));
                setMonth(String(date.getMonth()));
              }}
            />
            {incomplete && (
              <Chip
                size="small"
                label={formatMessage({ id: 'stats.incompleteMonth' })}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Stack>
          <Stack
            direction="row"
            gap={2}
            sx={{ '& > .MuiToggleButtonGroup-root': { height: { md: 44 } } }}
          >
            <TransactionTypeButtonGroup
              size="small"
              transactionType={transactionType}
              setTranasctionType={(type) => {
                setTransactionType(type);
                setActiveCategory(null);
              }}
            />
            <ToggleButtonGroup
              exclusive
              value={chartType}
              size="small"
              onChange={(_, value) => {
                if (value) {
                  setChartType(value);
                }
              }}
              aria-label={formatMessage({ id: 'stats.displayMode' })}
            >
              <ToggleButton
                value="bar"
                aria-label={formatMessage({ id: 'stats.barMode' })}
              >
                <BarChartIcon />
              </ToggleButton>
              <ToggleButton value="pie" aria-label="Donut">
                <PieChartIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
        {error ? (
          <Typography role="alert" color="error">
            {error}
          </Typography>
        ) : (
          <>
            <AdditionalBalanceInfo
              income={income}
              expense={expense}
              loading={loading}
            />
            <Box sx={{ ...cardStyles, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
              <Typography component="h2" variant="h6" fontWeight={600} mb={1}>
                {heading}
              </Typography>
              {loading ? (
                <TransactionSkeleton />
              ) : !chartData.length ? (
                <Typography color="text.secondary">
                  {formatMessage({ id: 'stats.noDataForMonth' })}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      md:
                        chartType === 'pie'
                          ? '300px minmax(0, 1fr)'
                          : 'minmax(0, 1fr)',
                    },
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  {chartType === 'pie' && (
                    <Box
                      sx={{
                        position: { xs: 'relative', md: 'sticky' },
                        top: { md: 16 },
                        alignSelf: 'start',
                        width: '100%',
                        maxWidth: 300,
                        mx: 'auto',
                      }}
                    >
                      <PieChart
                        height={280}
                        hideLegend
                        margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        series={[
                          {
                            id: 'categories',
                            data: chartData,
                            innerRadius: 92,
                            outerRadius: 125,
                            paddingAngle: 1,
                            highlightScope: {
                              highlight: 'item',
                              fade: 'global',
                            },
                            valueFormatter: (item) => money(item.value),
                          },
                        ]}
                        highlightedItem={
                          activeIndex >= 0
                            ? { seriesId: 'categories', dataIndex: activeIndex }
                            : null
                        }
                        onItemClick={(_, item) =>
                          setActiveCategory(chartData[item.dataIndex].category)
                        }
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: '90px 62px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {formatMessage({
                            id: isExpense
                              ? 'incomeExpense.expense'
                              : 'incomeExpense.income',
                          })}
                        </Typography>
                        <Typography
                          fontWeight={600}
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {money(total)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <CategoryBreakdown
                    items={chartData}
                    total={total}
                    chartType={chartType}
                    activeCategory={activeCategory}
                    isExpense={isExpense}
                  />
                </Box>
              )}
            </Box>
          </>
        )}
      </Stack>
    </StatisticsLayout>
  );
}
