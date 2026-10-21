'use client';

import { useId, useState, ReactNode } from 'react';
import {
  Box,
  ButtonBase,
  Collapse,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import { LoadingPlaceholder } from './TransactionSkeleton';
import { cardRadius, historyColors as colors } from './tokens';

export default function PeriodBalance({
  income,
  expense,
  loading = false,
  summaryContent,
}: {
  income: number | null;
  expense: number | null;
  loading?: boolean;
  summaryContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('sm'));
  const expanded = desktop || open;
  const Details = desktop ? Box : Collapse;
  const id = useId();
  const { formatMessage } = useIntl();
  const { settings } = useSettings();
  const balance = income === null || expense === null ? null : income - expense;

  if (summaryContent !== undefined) {
    return (
      <Box
        sx={{
          bgcolor: colors.card,
          borderRadius: cardRadius,
          px: { xs: 2, sm: 3 },
          py: 1,
        }}
      >
        <ButtonBase
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            width: '100%',
            minHeight: 44,
            textAlign: 'left',
            borderRadius: 1,
            '&.Mui-focusVisible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          }}
        >
          <Typography component="span" fontWeight={500}>
            {formatMessage({ id: 'stats.periodSummary' })}
          </Typography>
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </ButtonBase>
        <Collapse in={open} unmountOnExit>
          <Box id={id} sx={{ pt: 1, pb: 2 }}>
            {summaryContent}
          </Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: colors.card,
        borderRadius: cardRadius,
        p: 2,
        display: { sm: 'flex' },
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Box
        component={desktop ? 'div' : ButtonBase}
        {...(!desktop && {
          onClick: () => setOpen((value) => !value),
          'aria-expanded': open,
          'aria-controls': id,
        })}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: { xs: '100%', sm: '34%' },
          flexShrink: 0,
          textAlign: 'left',
          minHeight: 44,
          borderRadius: 1,
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
          },
        }}
      >
        <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography
            component="span"
            sx={{ display: 'block', fontSize: 14, color: colors.secondary }}
          >
            {formatMessage({
              id: expanded ? 'history.periodBalance' : 'balance.showInfo',
            })}
          </Typography>
          {expanded && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                fontSize: 24,
                fontWeight: 600,
                color:
                  (balance ?? 0) < 0 ? colors.negativeBalance : colors.income,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {loading ? (
                <LoadingPlaceholder component="span" width={110} height={28} />
              ) : balance === null ? (
                '—'
              ) : (
                formatCurrency(balance, settings.defaultCurrency)
              )}
            </Typography>
          )}
        </Box>
        {!desktop &&
          (open ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
      </Box>
      <Details
        {...(!desktop && { in: open, unmountOnExit: true })}
        sx={{ flex: 1, minWidth: 0 }}
      >
        <Box
          id={id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            borderTop: { xs: `1px solid ${colors.divider}`, sm: 0 },
            mt: { xs: 1, sm: 0 },
            pt: { xs: 1, sm: 0 },
          }}
        >
          {[
            {
              label: 'incomeExpense.income',
              value: income,
              color: colors.income,
            },
            {
              label: 'incomeExpense.expense',
              value: expense,
              color: colors.expense,
            },
          ].map((item) => (
            <Box key={item.label} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, color: colors.secondary }}>
                {formatMessage({ id: item.label })}
              </Typography>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: item.color,
                  fontVariantNumeric: 'tabular-nums',
                  overflowWrap: 'anywhere',
                }}
              >
                {loading ? (
                  <LoadingPlaceholder width={90} height={22} />
                ) : item.value === null ? (
                  '—'
                ) : (
                  formatCurrency(item.value, settings.defaultCurrency)
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      </Details>
    </Box>
  );
}
