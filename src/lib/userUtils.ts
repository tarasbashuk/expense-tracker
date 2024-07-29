import { currentUser, User as ClerkUser } from '@clerk/nextjs/server';
import { db } from './db';

import type { User } from '@prisma/client';
import { DEFAULT_SETTINGS } from '@/constants/constants';

const getClerkUser = async () => {
  const user = await currentUser();

  return user;
};

const getDBUser = async (user: ClerkUser) => {
  const dBuser = await db.user.findUnique({ where: { clerkUserId: user.id } });

  return dBuser;
};

export const getOrCreateUser = async (): Promise<User | null> => {
  const clerkUser = await getClerkUser();

  if (!clerkUser) {
    return null;
  }

  const dBuser = await getDBUser(clerkUser);

  if (dBuser) {
    return dBuser;
  }
  const { id, imageUrl, firstName, lastName, emailAddresses } = clerkUser;
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const newUser = db.user.create({
    data: {
      clerkUserId: id,
      firstName,
      lastName,
      fullName,
      imageUrl,
      email: emailAddresses[0].emailAddress,
      settings: {
        create: DEFAULT_SETTINGS,
      },
    },
  });

  return newUser;
};
