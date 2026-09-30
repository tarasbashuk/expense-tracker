import { Transaction, TransactionType } from '@prisma/client';

export function filterTransactions(
  transactions: Transaction[],
  search: string,
  category: string,
  type: TransactionType | 'all',
  recurringOnly = false,
): Transaction[] {
  const query = search.trim().normalize('NFC').toLocaleLowerCase();

  return transactions.filter((transaction) => {
    const matchesDescription = transaction.text
      .normalize('NFC')
      .toLocaleLowerCase()
      .includes(query);
    const matchesCategory =
      category === 'all' || transaction.category === category;
    const matchesType = type === 'all' || transaction.type === type;

    const matchesRecurring = !recurringOnly || transaction.isRecurring === true;

    return (
      matchesDescription && matchesCategory && matchesType && matchesRecurring
    );
  });
}
