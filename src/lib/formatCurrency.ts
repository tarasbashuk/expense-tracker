import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { Currency } from '@prisma/client';

export const formatCurrency = (amount: number, currency?: Currency): string => {
  // Use a locale that defaults to a dot as decimal separator (e.g., en-US)
  // and then replace the default thousand separator (comma) with a non-breaking space.
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);

  // Replace the comma thousand separator with a space (non-breaking space is preferred for currency)
  const finalFormattedAmount = formattedAmount.replace(/,/g, ' ');

  if (currency) {
    const symbol = CURRENCY_SYMBOL_MAP[currency];

    return `${finalFormattedAmount} ${symbol}`;
  }

  return finalFormattedAmount;
};
