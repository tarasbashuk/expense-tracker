'use server';
import { getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { Currencies } from '@/constants/types';
import { getMonobankRates } from '@/lib/monobankRatesCache';
import * as Sentry from '@sentry/nextjs';

async function getCurrencies(): Promise<{
  currencies?: Currencies;
  error?: string;
}> {
  try {
    const rates = await getMonobankRates();

    const currencies = getCurrenciesFromMap(rates);

    return { currencies };
  } catch (error) {
    console.error('Monobank API error:', error);
    Sentry.captureException(error);

    return { error: 'Monobank API error' };
  }
}

export default getCurrencies;
