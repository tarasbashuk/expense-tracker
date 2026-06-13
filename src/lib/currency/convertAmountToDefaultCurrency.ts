import Decimal from 'decimal.js';
import { Currency } from '@prisma/client';

import { CURRENCY_ISO_MAP } from '@/constants/constants';

type ConvertAmountToDefaultCurrencyParams = {
  amount: number;
  fromCurrency: Currency;
  defaultCurrency: Currency;
  currenciesMap: Record<string, number | null | undefined>;
};

export const convertAmountToDefaultCurrency = ({
  amount,
  fromCurrency,
  defaultCurrency,
  currenciesMap,
}: ConvertAmountToDefaultCurrencyParams): number | undefined => {
  if (fromCurrency === defaultCurrency) {
    return new Decimal(amount).toDecimalPlaces(2).toNumber();
  }

  const rateKey = `${CURRENCY_ISO_MAP[fromCurrency]}-${CURRENCY_ISO_MAP[defaultCurrency]}`;
  const rate = currenciesMap[rateKey];

  if (!rate) {
    return undefined;
  }

  if (fromCurrency === Currency.UAH || defaultCurrency === Currency.UAH) {
    return new Decimal(amount).div(rate).toDecimalPlaces(2).toNumber();
  }

  return new Decimal(amount).mul(rate).toDecimalPlaces(2).toNumber();
};
