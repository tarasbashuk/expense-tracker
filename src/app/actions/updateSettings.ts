'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';
import { Currency } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const settings = await db.settings.update({
      where: { clerkUserId: userId },
      data: {
        initialAmount,
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
