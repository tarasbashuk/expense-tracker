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
import useAnalyticsCurrency from './statistics/useAnalyticsCurrency';
import {
  initialHalfYear,
  yearlyPresentation,
} from '@/lib/statisticsPresentation';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import StatisticsLayout from './statistics/StatisticsLayout';
import PeriodAmounts from './statistics/PeriodAmounts';
import ChartLegendMarker from './statistics/ChartLegendMarker';
import AnalyticsHistoryLink from './statistics/AnalyticsHistoryLink';
import useAnalyticsQuery from '@/lib/hooks/useAnalyticsQuery';
import useAnalyticsScrollRestore from '@/lib/hooks/useAnalyticsScrollRestore';
import { historyMonthHref } from '@/lib/historyQuery';
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
  const { year, half, update } = useAnalyticsQuery('year');
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

  useAnalyticsScrollRestore(!loading && !error);

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
  const money = useAnalyticsCurrency();
  const incompleteLabel = formatMessage({ id: 'stats.incompleteMonth' });

  const series = [
    {
      id: 'income',
      data: visibleMonths.map((month) => (month.missing ? null : month.income)),
      label: formatMessage({ id: 'yearly.income' }),
      color: '#399F65',
      valueFormatter: (value: number | null) =>
        value === null ? '—' : money(value),
    },
    {
      id: 'expense',
      data: visibleMonths.map((month) =>
        month.missing ? null : month.expense,
      ),
      label: formatMessage({ id: 'yearly.expense' }),
      color: '#3982E4',
      valueFormatter: (value: number | null) =>
        value === null ? '—' : money(value),
    },
  ];
  const showIncomplete = visibleMonths.some((month) => month.incomplete);
  const showMissing = visibleMonths.some((month) => month.missing);

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
              update({
                year: selectedYear,
                half: initialHalfYear(selectedYear),
              });
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
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    gap={1}
                    mb={1}
                  >
                    <Box>
                      <Typography component="h2" variant="h6" fontWeight={600}>
                        {formatMessage({ id: 'yearly.chartTitle' })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {settings.defaultCurrency}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      gap={2}
                      aria-label={formatMessage({ id: 'yearly.chartLegend' })}
                    >
                      {series.map((item) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          alignItems="center"
                          gap={0.75}
                        >
                          <ChartLegendMarker color={item.color} />
                          <Typography variant="body2" color="text.secondary">
                            {item.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                  {mobile && (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      size="small"
                      value={half}
                      onChange={(_, value) => {
                        if (value !== null) {
                          update({ half: value });
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
                      height={mobile ? 280 : 320}
                      hideLegend
                      margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
                      grid={{ horizontal: true }}
                      series={series}
                      xAxis={[
                        {
                          data: visibleMonths.map((month) => month.month),
                          scaleType: 'band',
                          valueFormatter: (month, context) => {
                            const entry = presentation.months[month];
                            const label = monthLabel(
                              month,
                              context.location === 'tick',
                            );

                            if (context.location === 'tick') {
                              return `${label}${entry.incomplete ? '*' : entry.missing ? ' —' : ''}`;
                            }

                            return entry.incomplete
                              ? `${label} · ${incompleteLabel}`
                              : entry.missing
                                ? `${label} · ${formatMessage({ id: 'yearly.noRecordsYet' })}`
                                : label;
                          },
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
                      sx={{
                        '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': {
                          stroke: '#D8DFE8',
                        },
                        '& .MuiChartsAxis-tickLabel': {
                          fill: historyColors.secondary,
                        },
                        '& .MuiChartsGrid-line': { stroke: '#EEF1F5' },
                      }}
                    />
                  )}
                  {!!presentation.rows.length &&
                    (showIncomplete || showMissing) && (
                      <Stack direction="row" flexWrap="wrap" gap={2}>
                        {showIncomplete && (
                          <Typography variant="caption" color="text.secondary">
                            * {incompleteLabel}
                          </Typography>
                        )}
                        {showMissing && (
                          <Typography variant="caption" color="text.secondary">
                            — {formatMessage({ id: 'yearly.noRecordsYet' })}
                          </Typography>
                        )}
                      </Stack>
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
                          <AnalyticsHistoryLink
                            key={month.month}
                            href={historyMonthHref(year, month.month)}
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
                          </AnalyticsHistoryLink>
                        ))}
                      </Stack>
                    ) : (
                      <Table
                        size="small"
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          '& .MuiTableCell-root': {
                            borderColor: 'rgba(100, 112, 132, 0.12)',
                          },
                        }}
                      >
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
                              <TableRow
                                key={month.month}
                                sx={{
                                  position: 'relative',
                                  '&:hover': { bgcolor: 'action.hover' },
                                  '&:focus-within': {
                                    outline: '2px solid',
                                    outlineColor: 'primary.main',
                                  },
                                }}
                              >
                                <TableCell sx={{ py: 2 }}>
                                  <AnalyticsHistoryLink
                                    href={historyMonthHref(year, month.month)}
                                    sx={{
                                      textTransform: 'capitalize',
                                      '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                      },
                                    }}
                                  >
                                    {monthLabel(month.month)}
                                  </AnalyticsHistoryLink>{' '}
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
