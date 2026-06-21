import IncomeExpenseView from './IncomeExpenseView';
import getIncomeExpense from '@/app/actions/getIncomeExpense';

const IncomeExpense = async () => {
  const { income, expense } = await getIncomeExpense();

  return <IncomeExpenseView income={income} expense={expense} />;
};

export default IncomeExpense;
