'use server';
import axios from 'axios';
import { BankRate, getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { Currencies } from '@/constants/types';
import { MONOBANK_CURRENCY_API_URL } from '@/constants/constants';

async function getCurrencies(): Promise<{
  currencies?: Currencies;
  error?: string;
}> {
  try {
    const { data: rates } = await axios.get<BankRate[]>(
      MONOBANK_CURRENCY_API_URL,
    );

    const currencies = getCurrenciesFromMap(rates);

    return { currencies };
  } catch (error) {
    console.error('Monobank API error');

    return { error: 'Monobank API error' };
  }
}

export default getCurrencies;
