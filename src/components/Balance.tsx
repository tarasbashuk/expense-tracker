import { Typography, Stack } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

import getUserBalance from '@/app/actions/getUserBalance';
import { formatCurrency } from '@/lib/formatCurrency';

const Balance = async () => {
  const { balance, initialAmount, defaultCurrency } = await getUserBalance();

  return (
    <>
      <Typography variant="h5" component="p">
        Your balance
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1}>
        <HistoryIcon color="info" fontSize="small" />
        <Typography variant="subtitle2" color="text.secondary">
          Initial balance:{' '}
          {formatCurrency(Number(initialAmount), defaultCurrency)}
        </Typography>
      </Stack>
      <Typography variant="h4" component="p" gutterBottom>
        {formatCurrency(Number(balance), defaultCurrency)}
      </Typography>
    </>
  );
};

export default Balance;
