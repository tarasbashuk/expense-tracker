import { Settings } from '@prisma/client';

export type UserSettings = Pick<
  Settings,
  'theme' | 'language' | 'defaultCurrency'
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
