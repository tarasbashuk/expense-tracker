import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

import RecurringTransactionsList from '@/components/RecurringTransactionsList';

const RecurringTransactions = async () => {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <RecurringTransactionsList />
    </Suspense>
  );
};

export default RecurringTransactions;

