'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';
import { Currency } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { encryptFloat } from '@/lib/crypto';

async function updateSettings({
  initialAmount,
  defaultCurrency,
}: {
  initialAmount: number;
  defaultCurrency: Currency;
}): Promise<{
  settings?: UserSettings | null;
  error?: string;
}> {
  // const { userId } = auth();
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const encryptKey = user?.primaryEmailAddressId;
  const shouldDecrypt = !DO_NOT_ENCRYPT_LIST.includes(userEmail!);

  if (!userId) {
    return { error: 'User not found' };
  }

  const initialAmountVal =
    encryptKey && shouldDecrypt
      ? encryptFloat(initialAmount, encryptKey)
      : initialAmount;

  try {
    const settings = await db.settings.update({
      where: { clerkUserId: userId },
      data: {
        initialAmount: initialAmountVal,
        defaultCurrency,
      },
    });

    revalidatePath('/');

    return { settings };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default updateSettings;
