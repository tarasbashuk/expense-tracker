/* eslint-disable no-unused-vars */
/* lint is complaining about unused vars for ts type definitions */
import { Currency } from '@prisma/client';
import { ExpenseCategory, IncomeCategory, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'ENG',
  theme: 'Light',
  defaultCurrency: 'EUR',
  initialAmount: null,
};

export const INCOME_CATEGORIES: { [key in IncomeCategory]: string } = {
  salary: 'Salary',
  gifts: 'Gifts',
  creditReceived: 'Credit Received',
  ROI: 'Return on Investments',
  others: 'Others',
};

export const EXPENSE_CATEGORIES: { [key in ExpenseCategory]: string } = {
  groceries: 'Groceries',
  dining: 'Bar and Restaurant',
  rent: 'House Rent',
  utilities: 'Utility Bills',
  home: 'Home Stuff',
  auto: 'Auto',
  transport: 'Taxi and Public transport',
  shopping: 'Shopping',
  gadgets: 'Gadgets & Appliance',
  subscriptions: 'Mobile & App Subscriptions',
  pets: 'Pets',
  donations: 'Donations',
  education: 'Education',
  sports: 'Sports Activity',
  entertainment: 'Entertainment',
  beauty: 'Beauty Services & Goods',
  healthcare: 'Healthcare and Drugs',
  gifts: 'Gifts',
  trips: 'Trips',
  savings: 'Savings',
  investments: 'Investments',
  CCRepayment: 'Credit Card Repayment',
  others: 'Others',
};

export const INCOME_CATEGORIES_LIST = Object.entries(INCOME_CATEGORIES).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

export const EXPENSE_CATEGORIES_LIST = Object.entries(EXPENSE_CATEGORIES).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

export const CURRENCY_SYMBOL_MAP: Record<Currency, string> = {
  UAH: '₴',
  EUR: '€',
  USD: '$',
  PLN: 'zł',
};

export const MONTH_LIST = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

export const YEAR_LIST = ['2024', '2025', '2026'];

export const MIN_YEAR = YEAR_LIST[0];
export const MAX_YEAR = YEAR_LIST[YEAR_LIST.length - 1];

export const DATE_FORMATS = {
  YYYY_MM_DD: 'yyyy-MM-dd',
};

export const DO_NOT_ENCRYPT_LIST = [
  'bashuk.taras@gmail.com',
  'bashuk.mariia@gmail.com',
];

export const JANUARY = '0';
export const DECEMBER = '11';

export const CURRENCY_ISO_MAP: Record<Currency, number> = {
  EUR: 978,
  PLN: 985,
  UAH: 980,
  USD: 840,
  // MDL: 498,
} as const;

// Додаю константу для API Monobank
export const MONOBANK_CURRENCY_API_URL =
  'https://api.monobank.ua/bank/currency';
