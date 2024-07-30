import getUserBalance from '@/app/actions/getUserBalance';
import { Typography } from '@mui/material';

const Balance = async () => {
  const { balance } = await getUserBalance();

  return (
    <>
      <Typography variant="h5" component="p">
        Your Balance
      </Typography>
      <Typography variant="h4" component="p" gutterBottom>
        {balance ?? 0}
      </Typography>
    </>
  );
};

export default Balance;
