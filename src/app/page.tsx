import { currentUser } from '@clerk/nextjs/server';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import Guest from '@/components/Guest';
import Balance from '@/components/Balance';
import WelcomeMessage from '@/components/WelcomeMessage';
import QuickTransactions from '@/components/home/QuickTransactions';
import HomeMonthlySummary from '@/components/home/HomeMonthlySummary';
import RecentTransactions from '@/components/home/RecentTransactions';
import getHomeDashboard from '@/app/actions/getHomeDashboard';
import { getQuickTransactionTemplates } from '@/app/actions/quickTransactionTemplates';

export const dynamic = 'force-dynamic';

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  const [{ data }, { templates }] = await Promise.all([
    getHomeDashboard(),
    getQuickTransactionTemplates(),
  ]);

  const monthlySummary = data?.monthlySummary || {
    income: 0,
    expense: 0,
    net: 0,
    expenseChangePercent: null,
  };

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        maxWidth: 900,
        minWidth: 0,
        mx: 'auto',
        pb: { xs: 10, sm: 3 },
      }}
    >
      <WelcomeMessage firstName={user.firstName} />
      <Balance />
      <Stack spacing={2} mt={2} minWidth={0} width="100%">
        <QuickTransactions initialTemplates={templates || []} />
        <HomeMonthlySummary summary={monthlySummary} />
        <RecentTransactions transactions={data?.recentTransactions || []} />
      </Stack>
    </Box>
  );
};

export default HomePage;
