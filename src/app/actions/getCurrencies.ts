'use server';
import axios from 'axios';
import { BankRate, getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { Currencies } from '@/constants/types';

async function getCurrencies(): Promise<{
  currencies?: Currencies;
  error?: string;
}> {
  try {
    const { data: rates } = await axios.get<BankRate[]>(
      'https://api.monobank.ua/bank/currency',
    );

    const currencies = getCurrenciesFromMap(rates);

    return { currencies };
  } catch (error) {
    console.error('Monobank API error:', error);

    return { error: 'Monobank API error' };
  }
}

export default getCurrencies;
