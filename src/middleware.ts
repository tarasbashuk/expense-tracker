import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // Production security: specify allowed origins to prevent CSRF attacks
  authorizedParties:
    process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : undefined,
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
