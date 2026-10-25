'use client';

import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { ChartType, TransactionCategory } from '@/constants/types';
import CategoryIcon from '../history/CategoryIcon';
import { historyColors } from '../history/tokens';
import useAnalyticsCurrency from './useAnalyticsCurrency';
import ChartLegendMarker from './ChartLegendMarker';
import AnalyticsHistoryLink from './AnalyticsHistoryLink';
import { historyMonthHref } from '@/lib/historyQuery';

interface CategoryItem {
  category: string;
  label: string;
  value: number;
  color: string;
}

export default function CategoryBreakdown({
  year,
  month,
  items,
  total,
  chartType,
  activeCategory,
  isExpense,
}: {
  year: number;
  month: number;
  items: CategoryItem[];
  total: number;
  chartType: ChartType;
  activeCategory: string | null;
  isExpense: boolean;
}) {
  const { formatNumber } = useIntl();
  const money = useAnalyticsCurrency();
  const donut = chartType === 'pie';

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, minWidth: 0 }}>
      {items.map((item) => {
        const share = total > 0 ? item.value / total : 0;
        const selected = donut && activeCategory === item.category;
        const percentage = formatNumber(share, {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

        return (
          <Box
            component="li"
            key={item.category}
            aria-current={selected ? 'true' : undefined}
          >
            <AnalyticsHistoryLink
              href={historyMonthHref(
                year,
                month,
                isExpense ? 'Expense' : 'Income',
                item.category as TransactionCategory,
              )}
              sx={{
                display: 'grid',
                alignItems: 'center',
                columnGap: { xs: 1, md: 1.5 },
                rowGap: 0.5,
                gridTemplateColumns: donut
                  ? {
                      xs: 'minmax(0, 1fr) max-content',
                      md: 'minmax(0, 1fr) 64px minmax(140px, max-content)',
                    }
                  : '24px minmax(0, 1fr) auto',
                py: donut ? { xs: 1, md: 0.75 } : 0.875,
                minHeight: donut ? 44 : 62,
                borderBottom: '1px solid',
                borderColor: 'rgba(100, 112, 132, 0.12)',
                bgcolor: selected ? 'action.selected' : undefined,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {donut ? (
                <Box
                  sx={{
                    gridColumn: 1,
                    gridRow: { xs: '1 / 3', md: 1 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexShrink: 0,
                      color: 'text.secondary',
                    }}
                  >
                    <CategoryIcon category={item.category} />
                  </Box>
                  <ChartLegendMarker color={item.color} />
                  <Typography noWrap title={item.label} sx={{ minWidth: 0 }}>
                    {item.label}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      gridColumn: 1,
                      gridRow: 1,
                      color: 'text.secondary',
                      display: 'flex',
                    }}
                  >
                    <CategoryIcon category={item.category} />
                  </Box>
                  <Typography
                    sx={{
                      gridColumn: 2,
                      gridRow: 1,
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.label}
                  </Typography>
                </>
              )}
              <Typography
                sx={{
                  gridColumn: donut ? { xs: 2, md: 3 } : 3,
                  gridRow: 1,
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                  fontWeight: 600,
                  color:
                    donut || isExpense
                      ? historyColors.expense
                      : historyColors.income,
                }}
              >
                {money(item.value)}
              </Typography>
              {donut ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    gridColumn: 2,
                    gridRow: { xs: 2, md: 1 },
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {percentage}
                </Typography>
              ) : (
                <Box
                  sx={{
                    gridColumn: '2 / -1',
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
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
                        bgcolor: isExpense ? '#3982E4' : historyColors.income,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: 64, flexShrink: 0, textAlign: 'right' }}
                  >
                    {percentage}
                  </Typography>
                </Box>
              )}
            </AnalyticsHistoryLink>
          </Box>
        );
      })}
    </Box>
  );
}
