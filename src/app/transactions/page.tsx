import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

import TransactionList from '@/components/TransactionList';

const Transactions = async () => {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <Suspense fallback={<p>Loading Transaction List...</p>}>
      <TransactionList />
    </Suspense>
  );
};

export default Transactions;
