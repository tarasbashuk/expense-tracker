import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

import Stats from '@/components/Stats';

export const dynamic = 'force-dynamic';

const Transactions = async () => {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Stats />
    </Suspense>
  );
};

export default Transactions;
