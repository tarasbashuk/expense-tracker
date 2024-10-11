export interface BankRate {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

export const CURRENCY_ISO_MAP = {
  EUR: 978,
  PLN: 985,
  UAH: 980,
  USD: 840,
  MDL: 498,
};

// Cache to store previously computed cross rates
export const rateCache: { [key: string]: number | null } = {};

// Helper function to find a direct rate
export const findDirectRate = (
  currencyA: number,
  currencyB: number,
  rates: BankRate[],
): number | null => {
  const directRate = rates.find(
    (rate) =>
      rate.currencyCodeA === currencyA && rate.currencyCodeB === currencyB,
  );

  // Return the most relevant rate: rateBuy, rateSell, or rateCross
  return (
    directRate?.rateSell || directRate?.rateBuy || directRate?.rateCross || null
  );
};

// Get sell rate againts UAH
export const getUAHSellRate = (
  currency: number,
  rates: BankRate[],
): number | undefined =>
  rates.find((rate) => rate.currencyCodeA === currency)?.rateSell;

export const getUAHDirectRates = (
  currency: number,
  rates: BankRate[],
): {
  rateSell: number | undefined;
  rateBuy: number | undefined;
  rateCross: number | undefined;
} => {
  const { rateSell, rateBuy, rateCross } =
    rates.find((rate) => rate.currencyCodeA === currency) || {};

  return {
    rateSell,
    rateBuy,
    rateCross,
  };
};

// Get buy rate againts UAH
export const getUAHBuyRate = (
  currency: number,
  rates: BankRate[],
): number | undefined =>
  rates.find((rate) => rate.currencyCodeA === currency)?.rateBuy;

// Function to find a cross-rate, with caching
export const findRate = (
  currencyA: number,
  currencyB: number,
  rates: BankRate[],
  intermediary = CURRENCY_ISO_MAP.USD, // Default intermediary currency is USD
): number | null => {
  const cacheKey = `${currencyA}-${currencyB}`;

  // Check the cache first to avoid redundant calculations
  if (cacheKey in rateCache) {
    return rateCache[cacheKey];
  }

  // Try to find a direct rate first
  const directRate = findDirectRate(currencyA, currencyB, rates);

  if (directRate !== null) {
    rateCache[cacheKey] = directRate; // Cache the result

    return directRate;
  }

  // Try using the intermediary currency (USD by default)
  const rateToIntermediary = findDirectRate(currencyA, intermediary, rates);
  const rateFromIntermediary = findDirectRate(intermediary, currencyB, rates);

  if (rateToIntermediary !== null && rateFromIntermediary !== null) {
    const crossRate = rateToIntermediary * rateFromIntermediary;
    rateCache[cacheKey] = crossRate; // Cache the cross rate

    return crossRate;
  }

  // Cache the result if no rate found to avoid redundant attempts
  rateCache[cacheKey] = null;

  return null;
};
