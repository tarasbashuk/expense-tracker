import { unstable_cache } from 'next/cache';

import { MONOBANK_CURRENCY_API_URL } from '@/constants/constants';

let lastRates: any = null;
let lastFetched: number = 0;
const CACHE_TTL_SECONDS = 60;
const CACHE_TTL = CACHE_TTL_SECONDS * 1000;

const getPersistedMonobankRates = unstable_cache(
  async () => {
    const response = await fetch(MONOBANK_CURRENCY_API_URL);

    if (!response.ok) {
      throw new Error(`Monobank API responded with ${response.status}`);
    }

    return response.json();
  },
  ['monobank-currency-rates'],
  { revalidate: CACHE_TTL_SECONDS },
);

export async function getMonobankRates() {
  const now = Date.now();

  if (lastRates && now - lastFetched < CACHE_TTL) {
    return lastRates;
  }

  try {
    const data = await getPersistedMonobankRates();
    lastRates = data;
    lastFetched = now;

    return data;
  } catch (e) {
    if (lastRates) {
      console.warn('Monobank API error, returning cached rates');

      return lastRates;
    }
    throw e;
  }
}
