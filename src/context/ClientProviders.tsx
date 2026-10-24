'use client';
import { CategoryCatalogProvider } from '@/components/categories/useCategoryCatalog';
import { useAuth } from '@clerk/nextjs';
import { TagCatalogProvider } from '@/components/tags/useTagCatalog';
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
  const { userId } = useAuth();
  const { locale } = useSettings();

  return (
    <ThemeProvider theme={appTheme}>
      <IntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale="en-US"
      >
        <TagCatalogProvider
          key={userId || 'signed-out'}
          enabled={Boolean(userId)}
        >
          <CategoryCatalogProvider
            key={userId || 'signed-out'}
            enabled={Boolean(userId)}
          >
            {children}
          </CategoryCatalogProvider>
        </TagCatalogProvider>
      </IntlProvider>
    </ThemeProvider>
  );
};
