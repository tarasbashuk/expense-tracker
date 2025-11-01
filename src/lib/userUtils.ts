import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';

import type { User } from '@prisma/client';
import { DEFAULT_SETTINGS } from '@/constants/constants';

const getClerkUser = async () => {
  try {
    const user = await currentUser();

    return user;
  } catch (error) {
    return null;
  }
};

export const getOrCreateUser = async (): Promise<User | null> => {
  const clerkUser = await getClerkUser();

  if (!clerkUser) {
    return null;
  }

  // Check if user already exists by clerkUserId
  const existingUserByClerkId = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (existingUserByClerkId) {
    return existingUserByClerkId;
  }

  // Get email - use primaryEmailAddress (more reliable) or fallback to emailAddresses[0]
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    console.error('No email address found for Clerk user:', clerkUser.id);

    return null;
  }

  // Check if user exists by email (from development instance)
  // If so, update clerkUserId to production clerkUserId
  const existingUserByEmail = await db.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    // User exists from development, migrate to production Clerk ID
    // Transactions and Settings will be automatically updated via ON UPDATE CASCADE
    const updatedUser = await db.user.update({
      where: { email },
      data: {
        clerkUserId: clerkUser.id, // Only update clerkUserId - foreign keys handle the rest
      },
    });

    return updatedUser;
  }

  // User doesn't exist, create new one
  const { id, imageUrl, firstName, lastName } = clerkUser;
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  try {
    const newUser = await db.user.create({
      data: {
        clerkUserId: id,
        firstName,
        lastName,
        fullName,
        imageUrl,
        email,
        settings: {
          create: DEFAULT_SETTINGS,
        },
      },
    });

    return newUser;
  } catch (error: any) {
    // If user was created by another request (race condition), fetch it
    if (error?.code === 'P2002') {
      console.warn('Race condition detected, fetching existing user');
      const user = await db.user.findUnique({
        where: { clerkUserId: id },
      });
      if (user) {
        return user;
      }
    }
    console.error('Error creating user:', error);
    throw error;
  }
};
