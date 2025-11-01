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

  // Check if user exists by email (might be from different Clerk instance)
  const existingUserByEmail = await db.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    // Only migrate ONCE when entering production for the first time
    // After migration to production, keep production clerkUserId permanently
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && existingUserByEmail.clerkUserId !== clerkUser.id) {
      // First time entering production - migrate once (dev -> prod)
      const updatedUser = await db.user.update({
        where: { email },
        data: {
          clerkUserId: clerkUser.id,
        },
      });

      return updatedUser;
    }

    // In development: if clerkUserId doesn't match, user was already migrated to production
    // Return existing user (but transactions won't be accessible due to clerkUserId mismatch)
    // RECOMMENDATION: Use a separate test account in Clerk for development (different email)
    // This way you'll have separate development and production users with their own data
    if (!isProduction && existingUserByEmail.clerkUserId !== clerkUser.id) {
      console.warn(
        `⚠️  User with email ${email} already migrated to production. ` +
        `Local development will not have access to transactions. ` +
        `Use a separate test account in Clerk for development.`,
      );

      return existingUserByEmail;
    }

    // clerkUserId matches - return existing user
    return existingUserByEmail;
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
