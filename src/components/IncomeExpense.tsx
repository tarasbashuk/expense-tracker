import IncomeExpenseView from './IncomeExpenseView';
import getIncomeExpense from '@/app/actions/getIncomeExpense';

const IncomeExpense = async () => {
  const { income, expense, creditReceived, creditReturned } =
    await getIncomeExpense();

  return (
    <IncomeExpenseView
      income={income}
      expense={expense}
      creditReceived={creditReceived}
      creditReturned={creditReturned}
    />
  );
};

export default IncomeExpense;
