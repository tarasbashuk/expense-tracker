import axios from 'axios';
import { MONOBANK_CURRENCY_API_URL } from '@/constants/constants';

let lastRates: any = null;
let lastFetched: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getMonobankRates() {
  const now = Date.now();

  if (lastRates && now - lastFetched < CACHE_TTL) {
    return lastRates;
  }

  try {
    const { data } = await axios.get(MONOBANK_CURRENCY_API_URL);
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
