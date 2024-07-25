import { currentUser } from '@clerk/nextjs/server';

import Guest from '@/components/Guest';

const HomePage = async () => {
  const loggedInUser = await currentUser();

  if (!loggedInUser) {
    return <Guest />;
  }

  return (
    <main>
      <h1>Expense tracker</h1>
    </main>
  );
};

export default HomePage;
