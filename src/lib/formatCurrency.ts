import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { Currency } from '@prisma/client';

interface CurrencyFormatOptions {
  locale: string;
  minimumFractionDigits?: number;
}

export const formatCurrency = (
  amount: number,
  currency?: Currency,
  options?: CurrencyFormatOptions,
): string => {
  // Locale-aware formatting is opt-in; existing callers keep their display format.
  const formattedAmount = new Intl.NumberFormat(options?.locale ?? 'en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);

  const finalFormattedAmount = options
    ? formattedAmount
    : formattedAmount.replace(/,/g, ' ');

  if (currency) {
    const symbol = CURRENCY_SYMBOL_MAP[currency];

    return `${finalFormattedAmount} ${symbol}`;
  }

  return finalFormattedAmount;
};
