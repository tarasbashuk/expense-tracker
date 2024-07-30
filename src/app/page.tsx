import { currentUser } from '@clerk/nextjs/server';
import Guest from '@/components/Guest';
import Balance from '@/components/Balance';
import IncomeExpense from '@/components/IncomeExpense';

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return <Guest />;
  }

  return (
    <main>
      <h2>Welcome, {user.firstName}</h2>
      <Balance />
      <IncomeExpense />
    </main>
  );
};

export default HomePage;
