import {
  ShoppingCart,
  Utensils,
  House,
  Receipt,
  Wrench,
  Car,
  Bus,
  ShoppingBag,
  Smartphone,
  PawPrint,
  Heart,
  GraduationCap,
  Dumbbell,
  Clapperboard,
  Flower2,
  Cross,
  Gift,
  Plane,
  PiggyBank,
  CircleEllipsis,
  Banknote,
  TrendingUp,
  CreditCard,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react';
import { TransactionCategory } from '@/constants/types';

const icons: Record<TransactionCategory, LucideIcon> = {
  groceries: ShoppingCart,
  dining: Utensils,
  rent: House,
  utilities: Receipt,
  home: Wrench,
  auto: Car,
  transport: Bus,
  shopping: ShoppingBag,
  subscriptions: Smartphone,
  pets: PawPrint,
  donations: Heart,
  education: GraduationCap,
  sports: Dumbbell,
  entertainment: Clapperboard,
  beauty: Flower2,
  healthcare: Cross,
  gifts: Gift,
  trips: Plane,
  savings: PiggyBank,
  others: CircleEllipsis,
  salary: Banknote,
  investments: TrendingUp,
  creditReceived: CreditCard,
  ROI: TrendingUp,
  CCRepayment: CreditCard,
  gadgets: MonitorSmartphone,
};

export default function CategoryIcon({ category }: { category: string }) {
  const Icon = icons[category as TransactionCategory] || CircleEllipsis;

  return <Icon size={22} strokeWidth={1.75} aria-hidden="true" />;
}
