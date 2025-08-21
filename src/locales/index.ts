import enMessages from './en.json';
import ukMessages from './uk.json';

export const messages = {
  en: enMessages,
  uk: ukMessages,
};

export type Locale = keyof typeof messages;

export const defaultLocale: Locale = 'en';

export const supportedLocales: Locale[] = ['en', 'uk'];
