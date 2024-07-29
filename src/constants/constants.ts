import { ExpenseCategory, IncomeCategory, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'ENG',
  theme: 'LIGHT',
  defaultCurrency: 'EUR',
};

export const INCOME_CATEGORIES: {
  [key in IncomeCategory]: { label: string; icon: string };
} = {
  [IncomeCategory.SALARY]: { label: 'Salary', icon: 'AttachMoney' },
  [IncomeCategory.INVESTMENTS]: { label: 'Investments', icon: 'TrendingUp' },
  [IncomeCategory.GIFTS]: { label: 'Gifts', icon: 'CardGiftcard' },
};

export const EXPENSE_CATEGORIES: {
  [key in ExpenseCategory]: { label: string; icon: string };
} = {
  [ExpenseCategory.GROCERIES]: { label: 'Groceries', icon: 'ShoppingCart' },
  [ExpenseCategory.DINING]: { label: 'Bar and Restaurant', icon: 'Restaurant' },
  [ExpenseCategory.RENT]: { label: 'House Rent', icon: 'Home' },
  [ExpenseCategory.UTILITIES]: { label: 'Utility Bills', icon: 'Receipt' },
  [ExpenseCategory.HOME]: { label: 'Home Stuff', icon: 'HomeRepairService' },
  [ExpenseCategory.AUTO]: { label: 'Auto', icon: 'DirectionsCar' },
  [ExpenseCategory.SHOPPING]: { label: 'Shopping', icon: 'ShoppingBag' },
  [ExpenseCategory.SUBSCRIPTIONS]: {
    label: 'Mobile & App Subscriptions',
    icon: 'PhoneIphone',
  },
  [ExpenseCategory.PETS]: { label: 'Pets', icon: 'Pets' },
  [ExpenseCategory.DONATIONS]: { label: 'Donations', icon: 'Favorite' },
  [ExpenseCategory.EDUCATION]: { label: 'Education', icon: 'School' },
  [ExpenseCategory.SPORTS]: { label: 'Sports Activity', icon: 'Sports' },
  [ExpenseCategory.ENTERTAINMENT]: {
    label: 'Entertainment',
    icon: 'LocalMovies',
  },
  [ExpenseCategory.BEAUTY]: { label: 'Beauty Services & Goods', icon: 'Spa' },
  [ExpenseCategory.HEALTHCARE]: {
    label: 'Healthcare and Drugs',
    icon: 'LocalPharmacy',
  },
  [ExpenseCategory.GIFTS]: { label: 'Gifts', icon: 'CardGiftcard' },
  [ExpenseCategory.SAVINGS]: { label: 'Savings', icon: 'Savings' },
  [ExpenseCategory.OTHERS]: { label: 'Others', icon: 'MoreHoriz' },
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
