/* eslint-disable no-unused-vars */
/* lint is complaining about unused vars for ts type definitions */
import { Settings } from '@prisma/client';
import { EXPENSE_CATEGORIES } from './constants';

export type UserSettings = Pick<
  Settings,
  'theme' | 'language' | 'defaultCurrency' | 'initialAmount'
>;

export enum IncomeCategory {
  Salary = 'salary',
  Investments = 'investments',
  Gifts = 'gifts',
}

export enum ExpenseCategory {
  Groceries = 'groceries',
  Dining = 'dining',
  Rent = 'rent',
  Utilities = 'utilities',
  Home = 'home',
  Auto = 'auto',
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
  Others = 'others',
}

export type TranactionCategory = IncomeCategory | ExpenseCategory;
