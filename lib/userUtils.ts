import { currentUser, User as ClerkUser } from '@clerk/nextjs/server';
import { db } from './db';

import type { User } from '@prisma/client';

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

  const newUser = db.user.create({
    data: {
      clerkUserId: clerkUser.id,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
      imageUrl: clerkUser.imageUrl,
      email: clerkUser.emailAddresses[0].emailAddress,
    },
  });

  return newUser;
};
