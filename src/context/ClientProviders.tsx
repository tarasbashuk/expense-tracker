'use client';
import { IntlProvider } from 'react-intl';
import { messages } from '@/locales';
import { useSettings } from '@/context/SettingsContexts';

export const ClientProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useSettings();

  return (
    <IntlProvider
      locale={locale}
      messages={messages[locale]}
      defaultLocale="en-US"
    >
      {children}
    </IntlProvider>
  );
};
