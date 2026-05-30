import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/opengraph-image(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/contact/(.*)',
  '/api/inbound(.*)',
  '/api/channels/(.*)',
  '/api/webhooks/(.*)',
  '/api/inngest(.*)',
  '/api/health',
  '/monitoring(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
