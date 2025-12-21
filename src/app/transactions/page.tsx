import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

import TransactionList from '@/components/TransactionList';

export const dynamic = 'force-dynamic';

const Transactions = async () => {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <TransactionList />
    </Suspense>
  );
};

export default Transactions;
