import { currentUser } from '@clerk/nextjs/server';
import Box from '@mui/material/Box';

import Guest from '@/components/Guest';
import Balance from '@/components/Balance';
import IncomeExpense from '@/components/IncomeExpense';
import WelcomeMessage from '@/components/WelcomeMessage';

export const dynamic = 'force-dynamic';

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  return (
    <Box component="section" sx={{
      width: { xs: '100%', sm: 'auto' },
      maxWidth: { xs: '100%', sm: 410 },
    }}>
      <WelcomeMessage firstName={user.firstName} />
      <Balance />
      <IncomeExpense />
    </Box>
  );
};

export default HomePage;
