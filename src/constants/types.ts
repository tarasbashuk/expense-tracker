import { Settings } from '@prisma/client';

export type UserSettings = Pick<
  Settings,
  'theme' | 'language' | 'defaultCurrency'
>;
