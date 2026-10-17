import { TransactionType } from '@prisma/client';
import { Transaction } from './tags';

export function filterTransactions(
  transactions: Transaction[],
  search: string,
  category: string,
  type: TransactionType | 'all',
  recurringOnly = false,
  tagIds: string[] = [],
): Transaction[] {
  const query = search.trim().normalize('NFC').toLocaleLowerCase();

  const amountQuery = query.replace(/\s/g, '').replace(',', '.');
  const searchedAmount = /^\d+(?:\.\d+)?$/.test(amountQuery)
    ? Number(amountQuery)
    : null;

  return transactions.filter((transaction) => {
    const matchesDescription = transaction.text
      .normalize('NFC')
      .toLocaleLowerCase()
      .includes(query);
    const matchesAmount =
      searchedAmount !== null &&
      [transaction.amount, transaction.amountDefaultCurrency].some(
        (amount) => Number(amount.toFixed(2)) === searchedAmount,
      );
    const matchesCategory =
      category === 'all' || transaction.category === category;
    const matchesType = type === 'all' || transaction.type === type;

    const matchesRecurring = !recurringOnly || transaction.isRecurring === true;

    const matchesTags =
      !tagIds.length ||
      transaction.tags?.some((tag) => tagIds.includes(tag.id));

    return (
      matchesTags &&
      (matchesDescription || matchesAmount) &&
      matchesCategory &&
      matchesType &&
      matchesRecurring
    );
  });
}
