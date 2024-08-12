'use client';
import { createContext, useContext, ReactNode, useState } from 'react';
import { UserSettings } from '@/constants/types';

interface SettingsContextType {
  settings: UserSettings;
  /* eslint-disable-next-line no-unused-vars*/
  setSettings: (settings: UserSettings) => void;
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

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
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
