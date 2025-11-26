import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

type Context = {
  // Add context properties here if needed
  // For edge runtime, we typically don't have request-specific context
  // but you can add things like headers, user info, etc.
};

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

