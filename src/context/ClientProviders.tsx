'use client';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '@/theme';
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
    <ThemeProvider theme={appTheme}>
      <IntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale="en-US"
      >
        {children}
      </IntlProvider>
    </ThemeProvider>
  );
};
