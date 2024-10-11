'use server';
import axios from 'axios';
import { CURRENCY_ISO_MAP } from '@/constants/constants';
import {
  BankRate,
  findRate,
  getUAHDirectRates,
} from '@/lib/currenciesRate.utils';
import { Currencies } from '@/constants/types';

async function getCurrencies(): Promise<{
  currencies?: Currencies;
  error?: string;
}> {
  try {
    const { data: rates } = await axios.get<BankRate[]>(
      'https://api.monobank.ua/bank/currency',
    );

    const eurToPlnRate = findRate(
      CURRENCY_ISO_MAP.EUR,
      CURRENCY_ISO_MAP.PLN,
      rates,
    );
    const uahToEurRate = findRate(
      CURRENCY_ISO_MAP.UAH,
      CURRENCY_ISO_MAP.EUR,
      rates,
    );
    const eurToUahRate = findRate(
      CURRENCY_ISO_MAP.EUR,
      CURRENCY_ISO_MAP.UAH,
      rates,
    );
    const { rateBuy: directEurToUah, rateSell: directUahToEur } =
      getUAHDirectRates(CURRENCY_ISO_MAP.EUR, rates);
    const { rateBuy: directUsdToUah, rateSell: directUahToUsd } =
      getUAHDirectRates(CURRENCY_ISO_MAP.USD, rates);
    const { rateCross: uahToPlnCrossRate } = getUAHDirectRates(
      CURRENCY_ISO_MAP.PLN,
      rates,
    );
    const { rateCross: uahToMDLCrossRate } = getUAHDirectRates(
      CURRENCY_ISO_MAP.MDL,
      rates,
    );

    const currencies = {
      eurToPlnRate,
      uahToEurRate,
      eurToUahRate,
      directEurToUah,
      directUahToEur,
      directUsdToUah,
      directUahToUsd,
      uahToMDLCrossRate,
      uahToPlnCrossRate,
    };

    return { currencies };
  } catch (error) {
    console.error('Monobank API error:', error);

    return { error: 'Monobank API error' };
  }
}

export default getCurrencies;
