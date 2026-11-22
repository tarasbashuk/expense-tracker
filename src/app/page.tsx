import { currentUser } from '@clerk/nextjs/server';
import Box from '@mui/material/Box';
import { pageStyles } from '@/components/history/tokens';
import Guest from '@/components/Guest';
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
    plannedExpense: 0,
    expenseChangePercent: null,
  };

  return (
    <Box component="section" sx={pageStyles}>
      <WelcomeMessage firstName={user.firstName} />
      <Box sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <HomeMonthlySummary summary={monthlySummary} />
        <QuickTransactions initialTemplates={templates || []} />
        <RecentTransactions transactions={data?.recentTransactions || []} />
      </Box>
    </Box>
  );
};

export default HomePage;
