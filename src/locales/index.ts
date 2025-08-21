import enUS from './en-US.json';
import ukUA from './uk-UA.json';

export const messages = {
  'en-US': enUS,
  'uk-UA': ukUA,
} as const;

export type Locale = keyof typeof messages;

export const defaultLocale: Locale = 'en-US';

export const supportedLocales: Locale[] = ['en-US', 'uk-UA'];
