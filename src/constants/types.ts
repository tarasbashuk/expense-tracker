import { Settings } from '@prisma/client';

export type UserSettings = Pick<
  Settings,
  'theme' | 'language' | 'defaultCurrency'
>;

export enum TrasactionType {
  Expense = 'EXPENSE',
  Income = 'INCOME',
}

export enum IncomeCategory {
  SALARY = 'salary',
  INVESTMENTS = 'investments',
  GIFTS = 'gifts',
}

export enum ExpenseCategory {
  GROCERIES = 'groceries',
  DINING = 'dining',
  RENT = 'rent',
  UTILITIES = 'utilities',
  HOME = 'home',
  AUTO = 'auto',
  SHOPPING = 'shopping',
  SUBSCRIPTIONS = 'subscriptions',
  PETS = 'pets',
  DONATIONS = 'donations',
  EDUCATION = 'education',
  SPORTS = 'sports',
  ENTERTAINMENT = 'entertainment',
  BEAUTY = 'beauty',
  HEALTHCARE = 'healthcare',
  GIFTS = 'gifts',
  SAVINGS = 'savings',
  OTHERS = 'others',
}
