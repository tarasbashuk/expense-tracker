'use client';

import { useEffect, useState } from 'react';
import {
  Box,
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
import YearMonthSelect from './shared/YearMonthSelect';
import TransactionTypeButtonGroup from './shared/TransactionTypeButtonGroup';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import CategoryIcon from './history/CategoryIcon';
import TransactionSkeleton from './history/TransactionSkeleton';
import { cardStyles, historyColors } from './history/tokens';
import StatisticsLayout from './statistics/StatisticsLayout';
import getStats from '@/app/actions/getStats';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import { ChartType, TransactionCategory } from '@/constants/types';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import { COLOR_MAP } from '@/lib/getCategoryColor';

export default function Stats() {
  const { settings } = useSettings();
  const { formatMessage, formatNumber } = useIntl();
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
        >
          <YearMonthSelect
            year={year}
            month={month}
            setYear={setYear}
            setMonth={setMonth}
            sx={{
              '& .MuiFormControl-root': { minWidth: 0, flex: 1 },
              width: { xs: '100%', md: 340 },
            }}
          />
          <Stack direction="row" gap={2}>
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
              incomplete={incomplete}
            />
            <Box sx={{ ...cardStyles, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
              <Typography component="h2" variant="h6" fontWeight={600} mb={2}>
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
                        position: 'relative',
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
                            valueFormatter: (item) =>
                              formatCurrency(
                                item.value,
                                settings.defaultCurrency,
                              ),
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
                          {formatCurrency(total, settings.defaultCurrency)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <Box
                    component="ul"
                    sx={{ listStyle: 'none', m: 0, p: 0, minWidth: 0 }}
                  >
                    {chartData.map((item) => {
                      const share = total > 0 ? item.value / total : 0;
                      const selected =
                        chartType === 'pie' && activeCategory === item.category;

                      return (
                        <Box
                          component="li"
                          key={item.category}
                          aria-current={selected ? 'true' : undefined}
                          sx={{
                            display: 'flex',
                            gap: 1.5,
                            py: 1.5,
                            borderBottom: `1px solid ${historyColors.divider}`,
                            bgcolor: selected ? 'action.selected' : undefined,
                          }}
                        >
                          <Box
                            sx={{
                              pt: 0.25,
                              flexShrink: 0,
                              color:
                                chartType === 'pie'
                                  ? item.color
                                  : 'text.secondary',
                            }}
                          >
                            <CategoryIcon category={item.category} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                                flexWrap: 'wrap',
                                alignItems: 'baseline',
                              }}
                            >
                              <Typography
                                sx={{
                                  flex: '1 1 120px',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {item.label}
                              </Typography>
                              <Typography
                                sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                              >
                                {formatCurrency(
                                  item.value,
                                  settings.defaultCurrency,
                                )}
                              </Typography>
                            </Box>
                            <Stack
                              direction="row"
                              alignItems="center"
                              gap={1}
                              mt={0.75}
                            >
                              {chartType === 'bar' ? (
                                <Box
                                  sx={{
                                    flex: 1,
                                    height: 6,
                                    bgcolor: historyColors.divider,
                                    borderRadius: 3,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${Math.min(100, Math.max(0, share * 100))}%`,
                                      height: '100%',
                                      borderRadius: 3,
                                      bgcolor: isExpense
                                        ? '#3982E4'
                                        : historyColors.income,
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: item.color,
                                  }}
                                />
                              )}
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ minWidth: 56, textAlign: 'right' }}
                              >
                                {formatNumber(share, {
                                  style: 'percent',
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })}
                              </Typography>
                            </Stack>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Stack>
    </StatisticsLayout>
  );
}
