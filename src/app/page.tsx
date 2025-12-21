import { currentUser } from '@clerk/nextjs/server';
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
    <main>
      <WelcomeMessage firstName={user.firstName} />
      <Balance />
      <IncomeExpense />
    </main>
  );
};

export default HomePage;
