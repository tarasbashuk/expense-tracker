import { CURRENCY_ISO_MAP } from '@/constants/constants';
import Decimal from 'decimal.js';
import without from 'lodash/without';

export interface BankRate {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

const { UAH, EUR, USD } = CURRENCY_ISO_MAP;

export const getCurrenciesFromMap = (rates: BankRate[]) => {
  const currencies: Record<string, number> = {};

  const list = Object.values(CURRENCY_ISO_MAP);

  list.forEach((currencyA) => {
    const otherCurrencies = without(list, currencyA);

    otherCurrencies.forEach((currencyB) => {
      const rate = findRate(currencyA, currencyB, rates);

      if (rate) {
        currencies[`${currencyA}-${currencyB}`] = rate;
      }
    });
  });

  return currencies;
};

// Cache to store previously computed cross rates
export const rateCache: { [key: string]: number | null } = {};

const getUAHConversionRate = (
  currency: number,
  rates: BankRate[],
  toUAH = true,
): number | null => {
  const directRate = getDirectRates(currency, rates);

  if (toUAH) {
    // Convert to UAH (buy rate if converting from currency to UAH)
    return directRate.rateBuy || findUAHCrossRate(currency, rates) || null;
  }
  // Convert from UAH (sell rate if converting from UAH to currency)

  return directRate.rateSell || findUAHCrossRate(currency, rates) || null;
};

export const getDirectRates = (
  currency: number,
  rates: BankRate[],
  baseCurrency = UAH,
): {
  rateSell: number | undefined;
  rateBuy: number | undefined;
  rateCross: number | undefined;
} => {
  const { rateSell, rateBuy, rateCross } =
    rates.find(
      (rate) =>
        rate.currencyCodeA === currency && rate.currencyCodeB === baseCurrency,
    ) || {};

  return {
    rateSell,
    rateBuy,
    rateCross,
  };
};

export const findUAHCrossRate = (
  currency: number,
  rates: BankRate[],
): number | undefined => {
  const directRate = rates.find((rate) => rate.currencyCodeA === currency);

  return directRate?.rateCross;
};

// Function to find a cross-rate, with caching
export const findRate = (
  currencyA: number,
  currencyB: number,
  rates: BankRate[],
): number | null => {
  const cacheKey = `${currencyA}-${currencyB}`;

  // Check the cache first to avoid redundant calculations
  if (cacheKey in rateCache) {
    // console.log('In cache!!!!');

    return rateCache[cacheKey];
  }

  // The Next 6 cases a specific API resonse format:
  // "currencyCodeA":840,"currencyCodeB":980,"date":1728766873,"rateBuy":41.05,"rateSell":41.4852
  if (currencyA === UAH && currencyB === USD) {
    const { rateSell } = getDirectRates(USD, rates);
    rateCache[cacheKey] = rateSell!;

    return rateSell!;
  }

  if (currencyA === USD && currencyB === UAH) {
    const { rateBuy } = getDirectRates(USD, rates);
    rateCache[cacheKey] = rateBuy!;

    return rateBuy!;
  }

  if (currencyA === UAH && currencyB === EUR) {
    const { rateSell } = getDirectRates(EUR, rates);
    rateCache[cacheKey] = rateSell!;

    return rateSell!;
  }

  if (currencyA === EUR && currencyB === UAH) {
    const { rateBuy } = getDirectRates(EUR, rates);
    rateCache[cacheKey] = rateBuy!;

    return rateBuy!;
  }

  // if (currencyA === EUR && currencyB === USD) {
  //   const { rateSell } = getDirectRates(EUR, rates, USD);
  //   rateCache[cacheKey] = rateSell!;

  //   return rateSell!;
  // }

  // if (currencyA === USD && currencyB === EUR) {
  //   const { rateBuy } = getDirectRates(EUR, rates, USD);
  //   rateCache[cacheKey] = rateBuy!;

  //   return rateBuy!;
  // }

  // handle case if on of currency is UAH, "normal" API resonse format:
  // "currencyCodeA":826,"currencyCodeB":980,"date":1728811556,"rateCross":54.3091
  if (currencyA === UAH || currencyB === UAH) {
    const UAHtoCurrencyACrossRate = findUAHCrossRate(currencyA, rates);
    const UAHtoCurrencyBCrossRate = findUAHCrossRate(currencyB, rates);
    const rate = UAHtoCurrencyACrossRate || UAHtoCurrencyBCrossRate;

    if (rate) {
      rateCache[cacheKey] = rate;

      return rate;
    }
  }

  // Try using the intermediary currency (UAH)
  const rateToIntermediary =
    currencyA === UAH ? 1 : getUAHConversionRate(currencyA, rates);
  const rateFromIntermediary =
    currencyB === UAH ? 1 : getUAHConversionRate(currencyB, rates, false);

  if (rateToIntermediary && rateFromIntermediary) {
    const crossRate = rateToIntermediary / rateFromIntermediary;
    rateCache[cacheKey] = crossRate; // Cache the cross rate

    return new Decimal(crossRate).toDecimalPlaces(4).toNumber();
  }

  // Cache the result if no rate found to avoid redundant attempts
  rateCache[cacheKey] = null;

  return null;
};
