'use client';

import { useId, useState } from 'react';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import { historyColors as colors } from './tokens';

export default function PeriodBalance({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { formatMessage } = useIntl();
  const { settings } = useSettings();
  const balance = income - expense;

  return (
    <Box sx={{ bgcolor: colors.card, borderRadius: '16px', p: 2 }}>
      <ButtonBase
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          textAlign: 'left',
          minHeight: 44,
          borderRadius: 1,
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
          },
        }}
      >
        <Box component="span">
          <Typography
            component="span"
            sx={{ display: 'block', fontSize: 14, color: colors.secondary }}
          >
            {formatMessage({
              id: open ? 'history.periodBalance' : 'balance.showInfo',
            })}
          </Typography>
          {open && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                fontSize: 24,
                fontWeight: 600,
                color: balance < 0 ? colors.negativeBalance : colors.income,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(balance, settings.defaultCurrency)}
            </Typography>
          )}
        </Box>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box
          id={id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            borderTop: `1px solid ${colors.divider}`,
            mt: 1,
            pt: 1,
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
                {formatCurrency(item.value, settings.defaultCurrency)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
