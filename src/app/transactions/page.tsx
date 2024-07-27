import { Suspense } from 'react';

import TransactionList from '@/components/TransactionList';

const Transactions = async () => {
  return (
    <Suspense fallback={<p>Loading Transaction List...</p>}>
      <TransactionList />
    </Suspense>
  );
};

export default Transactions;
