import BalanceView from './BalanceView';
import getUserBalance from '@/app/actions/getUserBalance';

const Balance = async () => {
  const { balance, initialAmount, defaultCurrency } = await getUserBalance();

  return (
    <BalanceView
      balance={balance}
      initialAmount={initialAmount}
      defaultCurrency={defaultCurrency}
    />
  );
};

export default Balance;
