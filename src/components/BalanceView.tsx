'use client';
import { Typography, Stack, Box } from '@mui/material';
import { History } from 'lucide-react';
import { cardStyles, historyColors } from './history/tokens';
import { FormattedMessage } from 'react-intl';
import { formatCurrency } from '@/lib/formatCurrency';
import { Currency } from '@prisma/client';

interface Props {
  balance?: string;
  initialAmount?: string;
  defaultCurrency?: Currency;
}

const BalanceView = ({ balance, initialAmount, defaultCurrency }: Props) => (
  <Box sx={{ ...cardStyles, p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" component="h2" fontWeight={600}>
      <FormattedMessage id="balance.title" defaultMessage="Your balance" />
    </Typography>
    <Typography
      component="p"
      sx={{
        fontSize: { xs: 32, sm: 40 },
        fontWeight: 600,
        my: 1,
        fontVariantNumeric: 'tabular-nums',
        overflowWrap: 'anywhere',
        color:
          Number(balance) < 0
            ? historyColors.negativeBalance
            : historyColors.income,
      }}
    >
      {formatCurrency(Number(balance), defaultCurrency)}
    </Typography>
    <Stack direction="row" alignItems="center" spacing={1}>
      <History
        size={20}
        color="#1976D2"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
      <Typography variant="subtitle2" color="text.secondary">
        <FormattedMessage
          id="balance.initial"
          defaultMessage="Initial balance:"
        />{' '}
        {formatCurrency(Number(initialAmount), defaultCurrency)}
      </Typography>
    </Stack>
  </Box>
);

export default BalanceView;
