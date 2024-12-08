import getCurrencies from '@/app/actions/getCurrencies';
import getSettings from '@/app/actions/getSettings';
import { SettingsProvider } from '@/context/SettingsContexts';
import { TransactionsProvider } from '@/context/TranasctionsContext';
import { CurrenciesProvider } from '@/context/CurrenciesContext';
import { DEFAULT_SETTINGS } from '@/constants/constants';
import { getOrCreateUser } from '@/lib/userUtils';

export async function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  await getOrCreateUser();
  const { settings } = await getSettings();
  const { currencies } = await getCurrencies();

  return (
    <SettingsProvider initialSettings={settings || DEFAULT_SETTINGS}>
      <TransactionsProvider initialSettings={[]}>
        <CurrenciesProvider initialCurrencies={currencies || {}}>
          {children}
        </CurrenciesProvider>
      </TransactionsProvider>
    </SettingsProvider>
  );
}
