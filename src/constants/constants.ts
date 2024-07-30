/* eslint-disable no-unused-vars */
/* lint is complaining about unused vars for ts type definitions */
import { Currency } from '@prisma/client';
import { ExpenseCategory, IncomeCategory, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'ENG',
  theme: 'Light',
  defaultCurrency: 'EUR',
};

export const INCOME_CATEGORIES: {
  [key in IncomeCategory]: { label: string; icon: string };
} = {
  salary: { label: 'Salary', icon: 'AttachMoney' },
  investments: { label: 'Investments', icon: 'TrendingUp' },
  gifts: { label: 'Gifts', icon: 'CardGiftcard' },
};

export const EXPENSE_CATEGORIES: {
  [key in ExpenseCategory]: { label: string; icon: string };
} = {
  groceries: { label: 'Groceries', icon: 'ShoppingCart' },
  dining: { label: 'Bar and Restaurant', icon: 'Restaurant' },
  rent: { label: 'House Rent', icon: 'Home' },
  utilities: { label: 'Utility Bills', icon: 'Receipt' },
  home: { label: 'Home Stuff', icon: 'HomeRepairService' },
  auto: { label: 'Auto', icon: 'DirectionsCar' },
  shopping: { label: 'Shopping', icon: 'ShoppingBag' },
  subscriptions: {
    label: 'Mobile & App Subscriptions',
    icon: 'PhoneIphone',
  },
  pets: { label: 'Pets', icon: 'Pets' },
  donations: { label: 'Donations', icon: 'Favorite' },
  education: { label: 'Education', icon: 'School' },
  sports: { label: 'Sports Activity', icon: 'Sports' },
  entertainment: {
    label: 'Entertainment',
    icon: 'LocalMovies',
  },
  beauty: { label: 'Beauty Services & Goods', icon: 'Spa' },
  healthcare: {
    label: 'Healthcare and Drugs',
    icon: 'LocalPharmacy',
  },
  gifts: { label: 'Gifts', icon: 'CardGiftcard' },
  savings: { label: 'Savings', icon: 'Savings' },
  others: { label: 'Others', icon: 'MoreHoriz' },
};

export const INCOME_CATEGORIES_LIST = Object.entries(INCOME_CATEGORIES).map(
  ([key, value]) => ({
    value: key,
    label: value.label,
    icon: value.icon,
  }),
);

export const EXPENSE_CATEGORIES_LIST = Object.entries(EXPENSE_CATEGORIES).map(
  ([key, value]) => ({
    value: key,
    label: value.label,
    icon: value.icon,
  }),
);

export const CURRENCY_SYMBOL_MAP: Record<Currency, string> = {
  UAH: '₴',
  EUR: '€',
  USD: '$',
  PLN: 'zł',
};
