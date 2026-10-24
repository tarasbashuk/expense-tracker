import type { Transaction } from './tags';

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText =
    typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(
  transactions: Transaction[],
  defaultCurrency: string,
  categoryLabels: Record<string, string> = {},
): string {
  const header = [
    'Date',
    'Description',
    'Type',
    'Category',
    'Amount',
    'Currency',
    'Amount in default currency',
    'Default currency',
    'Tags',
  ];
  const rows = transactions.map((transaction) => [
    new Date(transaction.date).toISOString().slice(0, 10),
    transaction.text,
    transaction.type,
    categoryLabels[transaction.category] || transaction.category,
    transaction.amount,
    transaction.currency,
    transaction.amountDefaultCurrency,
    defaultCurrency,
    (transaction.tags ?? []).map((tag) => tag.name).join('; '),
  ]);

  return (
    '\uFEFF' +
    [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  );
}

export function downloadTransactionsCsv(
  transactions: Transaction[],
  defaultCurrency: string,
  filename: string,
  categoryLabels: Record<string, string> = {},
): void {
  const blob = new Blob(
    [transactionsToCsv(transactions, defaultCurrency, categoryLabels)],
    {
      type: 'text/csv;charset=utf-8;',
    },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
