import { currentUser } from '@clerk/nextjs/server';
import Guest from '@/components/Guest';
import Balance from '@/components/Balance';
import IncomeExpense from '@/components/IncomeExpense';
import WelcomeMessage from '@/components/WelcomeMessage';
import DebugErrorButton from '@/components/DebugErrorButton';

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  return (
    <main>
      <DebugErrorButton />
      <WelcomeMessage firstName={user.firstName} />
      <Balance />
      <IncomeExpense />
    </main>
  );
};

export default HomePage;
