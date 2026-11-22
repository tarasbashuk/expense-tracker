import Balance from '@/components/Balance';
import YearlyStats from '@/components/YearlyStats';

export default function Page() {
  return <YearlyStats balance={<Balance />} />;
}
