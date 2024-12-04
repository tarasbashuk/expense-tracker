'use server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettings } from '@/constants/types';
import { DO_NOT_ENCRYPT_LIST } from '@/constants/constants';
import { decryptFloat } from '@/lib/crypto';

async function getSettings(): Promise<{
  settings?: UserSettings | null;
  error?: string;
}> {
  // const { userId } = auth();
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return { error: 'User not found' };
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const decryptKey = user?.primaryEmailAddressId;
  const shouldDecrypt = !DO_NOT_ENCRYPT_LIST.includes(userEmail!);

  try {
    const settings = await db.settings.findUnique({
      where: { clerkUserId: userId },
      select: {
        language: true,
        theme: true,
        defaultCurrency: true,
        initialAmount: true,
      },
    });

    return {
      settings:
        decryptKey && shouldDecrypt
          ? ({
              ...settings,
              initialAmount: decryptFloat(
                settings?.initialAmount || 0,
                decryptKey,
              ),
            } as UserSettings)
          : settings,
    };
  } catch (error) {
    return { error: 'Database error' };
  }
}

export default getSettings;
