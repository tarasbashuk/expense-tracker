'use client';
import { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { UserSettings } from '@/constants/types';
import { Language } from '@prisma/client';

type Locale = 'en' | 'uk';

interface SettingsContextType {
  settings: UserSettings;
  locale: Locale;
  /* eslint-disable-next-line no-unused-vars*/
  setSettings: (settings: UserSettings) => void;
  /* eslint-disable-next-line no-unused-vars*/
  setLocale: (locale: Locale) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider = ({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: UserSettings;
}) => {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);

  const locale = useMemo(
    () => (settings.language === Language.ENG ? 'en' : 'uk'),
    [settings.language],
  );

  const setLocale = (newLocale: Locale) => {
    const newLanguage = newLocale === 'en' ? Language.ENG : Language.UKR;
    setSettings((prevSettings) => ({
      ...prevSettings,
      language: newLanguage,
    }));
  };

  return (
    <SettingsContext.Provider
      value={{ settings, locale, setSettings, setLocale }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
};
