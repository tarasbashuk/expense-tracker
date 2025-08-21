'use client';
import { Typography, Stack } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { FormattedMessage } from 'react-intl';
import { formatCurrency } from '@/lib/formatCurrency';
import { Currency } from '@prisma/client';

interface Props {
  balance?: string;
  initialAmount?: string;
  defaultCurrency?: Currency;
}

const BalanceView = ({ balance, initialAmount, defaultCurrency }: Props) => (
  <>
    <Typography variant="h5" component="p">
      <FormattedMessage id="balance.title" defaultMessage="Your balance" />
    </Typography>
    <Stack direction="row" alignItems="center" spacing={1}>
      <HistoryIcon color="info" fontSize="small" />
      <Typography variant="subtitle2" color="text.secondary">
        <FormattedMessage
          id="balance.initial"
          defaultMessage="Initial balance:"
        />{' '}
        {formatCurrency(Number(initialAmount), defaultCurrency)}
      </Typography>
    </Stack>
    <Typography variant="h4" component="p" gutterBottom>
      {formatCurrency(Number(balance), defaultCurrency)}
    </Typography>
  </>
);

export default BalanceView;
