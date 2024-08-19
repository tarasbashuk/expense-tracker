/* eslint-disable no-unused-vars */
/* lint is complaining about unused vars for ts type definitions */
import { Currency, Settings, TransactionType } from '@prisma/client';

export type UserSettings = Pick<
  Settings,
  'theme' | 'language' | 'defaultCurrency' | 'initialAmount'
>;

export enum IncomeCategory {
  ROI = 'ROI',
  Salary = 'salary',
  Gifts = 'gifts',
  Others = 'others',
}

export enum ExpenseCategory {
  Groceries = 'groceries',
  Dining = 'dining',
  Rent = 'rent',
  Utilities = 'utilities',
  Home = 'home',
  Auto = 'auto',
  Transport = 'transport',
  Shopping = 'shopping',
  Subscriptions = 'subscriptions',
  Pets = 'pets',
  Donations = 'donations',
  Education = 'education',
  Sports = 'sports',
  Entertainment = 'entertainment',
  Beauty = 'beauty',
  Healthcare = 'healthcare',
  Gifts = 'gifts',
  Savings = 'savings',
  Investments = 'investments',
  Others = 'others',
}

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface TransactionFormData {
  date: Date;
  text: string;
  amount: number;
  category: string;
  currency: Currency;
  type: TransactionType;
  amountDefaultCurrency?: number;
}
