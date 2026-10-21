'use client';

import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { ChartType } from '@/constants/types';
import CategoryIcon from '../history/CategoryIcon';
import { historyColors } from '../history/tokens';
import useAnalyticsCurrency from './useAnalyticsCurrency';

interface CategoryItem {
  category: string;
  label: string;
  value: number;
  color: string;
}

export default function CategoryBreakdown({
  items,
  total,
  chartType,
  activeCategory,
  isExpense,
}: {
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
            sx={{
              display: 'grid',
              alignItems: 'center',
              columnGap: { xs: 1, md: 1.5 },
              rowGap: 0.5,
              gridTemplateColumns: donut
                ? {
                    xs: '24px minmax(0, 1fr) auto',
                    md: '24px minmax(0, 1fr) 10px 64px 140px',
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
            <Typography
              sx={{
                gridColumn: donut ? { xs: 3, md: 5 } : 3,
                gridRow: 1,
                whiteSpace: 'nowrap',
                textAlign: 'right',
                fontWeight: 600,
                color: isExpense ? historyColors.expense : historyColors.income,
              }}
            >
              {money(item.value)}
            </Typography>
            {donut ? (
              <>
                <Box
                  aria-hidden
                  sx={{
                    gridColumn: { xs: 2, md: 3 },
                    gridRow: { xs: 2, md: 1 },
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: item.color,
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    gridColumn: { xs: 3, md: 4 },
                    gridRow: { xs: 2, md: 1 },
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {percentage}
                </Typography>
              </>
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
          </Box>
        );
      })}
    </Box>
  );
}
