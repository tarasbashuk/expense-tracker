'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';
import { decryptFloat } from '@/lib/crypto';

async function getSettings(): Promise<{
  settings?: UserSettings | null;
  error?: string;
}> {
  const user = await currentUser();
  const userId = user?.id;
  const encryptKey = user?.primaryEmailAddressId;

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const settings = await db.settings.findUnique({
      where: { clerkUserId: userId },
      select: {
        language: true,
        theme: true,
        defaultCurrency: true,
        initialAmount: true,
        encryptData: true,
      },
    });

    if (!settings) return { settings: null };

    const shouldDecrypt = Boolean(settings.encryptData && encryptKey);

    const initialAmount =
      shouldDecrypt && settings.initialAmount != null && encryptKey
        ? decryptFloat(settings.initialAmount, encryptKey)
        : (settings.initialAmount ?? null);

    return {
      settings: { ...settings, initialAmount } as UserSettings,
    };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getSettings;
