import { ExpenseCategory, IncomeCategory, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'ENG',
  theme: 'Light',
  defaultCurrency: 'EUR',
};

export const INCOME_CATEGORIES: {
  [key in IncomeCategory]: { label: string; icon: string };
} = {
  [IncomeCategory.Salary]: { label: 'Salary', icon: 'AttachMoney' },
  [IncomeCategory.Investments]: { label: 'Investments', icon: 'TrendingUp' },
  [IncomeCategory.Gifts]: { label: 'Gifts', icon: 'CardGiftcard' },
};

export const EXPENSE_CATEGORIES: {
  [key in ExpenseCategory]: { label: string; icon: string };
} = {
  [ExpenseCategory.Groceries]: { label: 'Groceries', icon: 'ShoppingCart' },
  [ExpenseCategory.Dining]: { label: 'Bar and Restaurant', icon: 'Restaurant' },
  [ExpenseCategory.Rent]: { label: 'House Rent', icon: 'Home' },
  [ExpenseCategory.Utilities]: { label: 'Utility Bills', icon: 'Receipt' },
  [ExpenseCategory.Home]: { label: 'Home Stuff', icon: 'HomeRepairService' },
  [ExpenseCategory.Auto]: { label: 'Auto', icon: 'DirectionsCar' },
  [ExpenseCategory.Shopping]: { label: 'Shopping', icon: 'ShoppingBag' },
  [ExpenseCategory.Subscriptions]: {
    label: 'Mobile & App Subscriptions',
    icon: 'PhoneIphone',
  },
  [ExpenseCategory.Pets]: { label: 'Pets', icon: 'Pets' },
  [ExpenseCategory.Donations]: { label: 'Donations', icon: 'Favorite' },
  [ExpenseCategory.Education]: { label: 'Education', icon: 'School' },
  [ExpenseCategory.Sports]: { label: 'Sports Activity', icon: 'Sports' },
  [ExpenseCategory.Entertainment]: {
    label: 'Entertainment',
    icon: 'LocalMovies',
  },
  [ExpenseCategory.Beauty]: { label: 'Beauty Services & Goods', icon: 'Spa' },
  [ExpenseCategory.Healthcare]: {
    label: 'Healthcare and Drugs',
    icon: 'LocalPharmacy',
  },
  [ExpenseCategory.Gifts]: { label: 'Gifts', icon: 'CardGiftcard' },
  [ExpenseCategory.Savings]: { label: 'Savings', icon: 'Savings' },
  [ExpenseCategory.Others]: { label: 'Others', icon: 'MoreHoriz' },
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
