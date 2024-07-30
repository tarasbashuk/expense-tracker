import { currentUser } from '@clerk/nextjs/server';
import Guest from '@/components/Guest';
import Balance from '@/components/Balance';
import IncomeExpense from '@/components/IncomeExpense';
import { Typography } from '@mui/material';

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  return (
    <main>
      <Typography variant="h4" component="h3" gutterBottom>
        Welcome, {user.firstName}
      </Typography>
      <Balance />
      <IncomeExpense />
    </main>
  );
};

export default HomePage;
