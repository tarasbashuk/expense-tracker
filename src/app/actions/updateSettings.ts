'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';
import { Currency, Language } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { encryptFloat, decryptFloat } from '@/lib/crypto';

async function updateSettings({
  initialAmount,
  defaultCurrency,
  language,
  encryptData,
}: {
  initialAmount: number;
  defaultCurrency: Currency;
  language: Language;
  encryptData?: boolean;
}): Promise<{
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
    const updateData: Partial<UserSettings> = {
      defaultCurrency,
      language,
      encryptData: encryptData ?? false,
    };

    // Handle initialAmount encryption/decryption
    if (encryptData && encryptKey) {
      updateData.initialAmount = encryptFloat(initialAmount, encryptKey);
    } else {
      updateData.initialAmount = initialAmount;
    }

    const stored = await db.settings.update({
      where: { clerkUserId: userId },
      data: updateData,
      select: {
        language: true,
        theme: true,
        defaultCurrency: true,
        initialAmount: true,
        encryptData: true,
      },
    });

    // Decrypt initialAmount for client if needed
    let clientInitialAmount = stored.initialAmount;
    if (stored.encryptData && encryptKey && stored.initialAmount != null) {
      clientInitialAmount = decryptFloat(stored.initialAmount, encryptKey);
    }

    const settings = {
      ...stored,
      initialAmount: clientInitialAmount,
    } as UserSettings;

    revalidatePath('/');
    revalidatePath('/settings');

    return { settings };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default updateSettings;
