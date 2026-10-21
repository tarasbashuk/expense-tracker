'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useIntl } from 'react-intl';
import { YEAR_LIST } from '@/constants/constants';
import { getYearlyStats, YearlyStatsData } from '@/app/actions/getYearlyStats';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  initialHalfYear,
  yearlyPresentation,
} from '@/lib/statisticsPresentation';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import StatisticsLayout from './statistics/StatisticsLayout';
import PeriodAmounts from './statistics/PeriodAmounts';
import { cardStyles, historyColors } from './history/tokens';
import TransactionSkeleton from './history/TransactionSkeleton';

const ukrainianMonths = [
  'Січ',
  'Лют',
  'Бер',
  'Кві',
  'Тра',
  'Чер',
  'Лип',
  'Сер',
  'Вер',
  'Жов',
  'Лис',
  'Гру',
];

export default function YearlyStatsContent() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [half, setHalf] = useState(() => initialHalfYear(year));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<YearlyStatsData | null>(null);
  const { formatMessage, locale } = useIntl();
  const { settings } = useSettings();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const fetchData = async () => {
      try {
        const response = await getYearlyStats(year);

        if (!cancelled) {
          setData(response.data ?? null);
          setError(response.error ?? '');
        }
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
  }, [year, formatMessage]);

  const presentation = yearlyPresentation(
    data?.monthlyIncome ?? [],
    data?.monthlyExpense ?? [],
    data?.monthlyTransactionCounts ?? [],
    year,
  );
  const visibleMonths = mobile
    ? presentation.months.slice(half * 6, half * 6 + 6)
    : presentation.months;
  const monthLabel = (month: number, short = false) =>
    short && locale.startsWith('uk')
      ? ukrainianMonths[month]
      : new Intl.DateTimeFormat(locale, {
          month: short ? 'short' : 'long',
        }).format(new Date(year, month, 1));
  const money = (value: number) =>
    formatCurrency(value, settings.defaultCurrency);
  const incompleteLabel = formatMessage({ id: 'stats.incompleteMonth' });

  return (
    <StatisticsLayout titleId="yearly.title">
      <Stack spacing={2}>
        <FormControl sx={{ width: 160 }} size="small">
          <InputLabel id="year-select-label">
            {formatMessage({ id: 'filters.year' })}
          </InputLabel>
          <Select
            labelId="year-select-label"
            value={year}
            label={formatMessage({ id: 'filters.year' })}
            onChange={(event) => {
              const selectedYear = Number(event.target.value);
              setYear(selectedYear);
              setHalf(initialHalfYear(selectedYear));
            }}
          >
            {YEAR_LIST.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {error ? (
          <Typography role="alert" color="error">
            {error}
          </Typography>
        ) : (
          <>
            <AdditionalBalanceInfo
              income={presentation.income}
              expense={presentation.expense}
              loading={loading}
            />
            {loading ? (
              <TransactionSkeleton />
            ) : (
              <>
                <Box sx={{ ...cardStyles, p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
                  <Typography component="h2" variant="h6" fontWeight={600}>
                    {formatMessage({ id: 'yearly.chartTitle' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {settings.defaultCurrency}
                  </Typography>
                  {mobile && (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      size="small"
                      value={half}
                      onChange={(_, value) => {
                        if (value !== null) {
                          setHalf(value);
                        }
                      }}
                      aria-label={formatMessage({ id: 'yearly.halfYear' })}
                    >
                      <ToggleButton value={0}>
                        {formatMessage({ id: 'yearly.firstHalf' })}
                      </ToggleButton>
                      <ToggleButton value={1}>
                        {formatMessage({ id: 'yearly.secondHalf' })}
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                  {!presentation.rows.length ? (
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      {formatMessage({ id: 'yearly.noData' })}
                    </Typography>
                  ) : (
                    <BarChart
                      height={mobile ? 300 : 350}
                      margin={{ top: 16, right: 8, bottom: 8, left: 0 }}
                      grid={{ horizontal: true }}
                      series={[
                        {
                          id: 'income',
                          data: visibleMonths.map((month) =>
                            month.missing ? null : month.income,
                          ),
                          label: formatMessage({ id: 'yearly.income' }),
                          color: '#399F65',
                          valueFormatter: (value) =>
                            value === null ? '—' : money(value),
                        },
                        {
                          id: 'expense',
                          data: visibleMonths.map((month) =>
                            month.missing ? null : month.expense,
                          ),
                          label: formatMessage({ id: 'yearly.expense' }),
                          color: '#3982E4',
                          valueFormatter: (value) =>
                            value === null ? '—' : money(value),
                        },
                      ]}
                      xAxis={[
                        {
                          data: visibleMonths.map((month) => month.month),
                          scaleType: 'band',
                          valueFormatter: (month, context) =>
                            monthLabel(month, context.location === 'tick'),
                          tickLabelInterval: () => true,
                          tickLabelStyle: { angle: 0 },
                          height: 32,
                        },
                      ]}
                      yAxis={[
                        {
                          min: 0,
                          max: presentation.axisMax,
                          width: 58,
                          valueFormatter: (value: number) =>
                            new Intl.NumberFormat(locale, {
                              notation: 'compact',
                              maximumFractionDigits: 1,
                            }).format(value),
                        },
                      ]}
                      slotProps={{
                        legend: {
                          direction: 'horizontal',
                          position: { vertical: 'top', horizontal: 'end' },
                        },
                      }}
                    />
                  )}
                </Box>
                {!!presentation.rows.length && (
                  <Box sx={{ ...cardStyles, p: { xs: 2, sm: 3 } }}>
                    <Typography
                      component="h2"
                      variant="h6"
                      fontWeight={600}
                      mb={2}
                    >
                      {formatMessage({ id: 'yearly.byMonth' })}
                    </Typography>
                    {mobile ? (
                      <Stack spacing={2}>
                        {presentation.rows.map((month) => (
                          <Box
                            key={month.month}
                            sx={{
                              border: `1px solid ${historyColors.divider}`,
                              borderRadius: 2,
                              p: 1.5,
                            }}
                          >
                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              gap={1}
                              justifyContent="space-between"
                              mb={1.5}
                            >
                              <Typography
                                fontWeight={600}
                                sx={{ textTransform: 'capitalize' }}
                              >
                                {monthLabel(month.month)}
                              </Typography>
                              {month.incomplete && (
                                <Chip size="small" label={incompleteLabel} />
                              )}
                            </Stack>
                            <PeriodAmounts
                              income={month.income}
                              expense={month.expense}
                            />
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {[
                              'filters.month',
                              'incomeExpense.income',
                              'incomeExpense.expense',
                              'home.net',
                            ].map((id, index) => (
                              <TableCell
                                key={id}
                                align={index ? 'right' : 'left'}
                              >
                                {formatMessage({ id })}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {presentation.rows.map((month) => {
                            const difference = month.income - month.expense;

                            return (
                              <TableRow key={month.month}>
                                <TableCell
                                  sx={{ textTransform: 'capitalize', py: 2 }}
                                >
                                  {monthLabel(month.month)}{' '}
                                  {month.incomplete && (
                                    <Chip
                                      size="small"
                                      label={incompleteLabel}
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color: historyColors.income,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {money(month.income)}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color: historyColors.expense,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {money(month.expense)}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color:
                                      difference < 0
                                        ? historyColors.negativeBalance
                                        : historyColors.income,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {difference > 0 ? '+' : ''}
                                  {money(difference)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Stack>
    </StatisticsLayout>
  );
}
