'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';

async function getSettings(): Promise<{
  settings?: UserSettings | null;
  error?: string;
}> {
  const { userId } = auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    const settings = await db.settings.findUnique({
      where: { userId },
      select: {
        language: true,
        theme: true,
        defaultCurrency: true,
      },
    });

    return { settings };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getSettings;
