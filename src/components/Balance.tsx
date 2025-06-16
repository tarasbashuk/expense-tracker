import { Typography } from '@mui/material';

import getUserBalance from '@/app/actions/getUserBalance';
import { formatCurrency } from '@/lib/formatCurrency';

const Balance = async () => {
  const { balance, defaultCurrency } = await getUserBalance();

  return (
    <>
      <Typography variant="h5" component="p">
        Your Balance
      </Typography>
      <Typography variant="h4" component="p" gutterBottom>
        {formatCurrency(Number(balance), defaultCurrency)}
      </Typography>
    </>
  );
};

export default Balance;
