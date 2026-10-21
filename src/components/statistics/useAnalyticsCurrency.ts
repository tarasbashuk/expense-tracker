'use client';

import { useIntl } from 'react-intl';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';

export default function useAnalyticsCurrency() {
  const { locale } = useIntl();
  const { settings } = useSettings();

  return (amount: number) =>
    formatCurrency(amount, settings.defaultCurrency, {
      locale,
      minimumFractionDigits: 2,
    });
}
