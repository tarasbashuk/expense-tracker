import { Typography } from '@mui/material';

import getUserBalance from '@/app/actions/getUserBalance';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';

const Balance = async () => {
  const { balance, defaultCurrency } = await getUserBalance();

  return (
    <>
      <Typography variant="h5" component="p">
        Your Balance
      </Typography>
      <Typography variant="h4" component="p" gutterBottom>
        {balance ?? 0} {CURRENCY_SYMBOL_MAP[defaultCurrency!]}
      </Typography>
    </>
  );
};

export default Balance;
