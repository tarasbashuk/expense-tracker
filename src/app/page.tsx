import { currentUser } from '@clerk/nextjs/server';
import Box from '@mui/material/Box';
import { pageStyles } from '@/components/history/tokens';

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
    <Box component="section" sx={pageStyles}>
      <WelcomeMessage firstName={user.firstName} />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 0.85fr) minmax(0, 1.35fr)',
          },
        }}
      >
        <Box sx={{ minWidth: 0, '& > *': { height: '100%' } }}>
          <Balance />
        </Box>
        <Box
          sx={{
            minWidth: 0,
            gridArea: { md: '2 / 1 / 3 / 3' },
          }}
        >
          <QuickTransactions initialTemplates={templates || []} />
        </Box>
        <Box
          sx={{
            minWidth: 0,
            gridColumn: { md: 2 },
            gridRow: { md: 1 },
            '& > *': { height: '100%' },
          }}
        >
          <HomeMonthlySummary summary={monthlySummary} />
        </Box>
        <Box sx={{ minWidth: 0, gridColumn: { md: '1 / -1' } }}>
          <RecentTransactions transactions={data?.recentTransactions || []} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
