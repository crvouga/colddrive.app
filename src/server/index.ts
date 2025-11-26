import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { clientSideSchemaRouter } from './client-side-schema';

export const appRouter = router({
  greeting: router({
    hello: publicProcedure
      .input(z.object({ name: z.string().optional() }).optional())
      .query(({ input }) => {
        return {
          message: `Hello ${input?.name ?? 'World'}!`,
          timestamp: new Date().toISOString(),
        };
      }),
    getAll: publicProcedure.query(() => {
      return [
        { id: 1, message: 'Hello from tRPC!' },
        { id: 2, message: 'This is running on Vercel Edge Functions' },
        { id: 3, message: 'No TanStack Query needed!' },
      ];
    }),
  }),
  clientSideSchema: clientSideSchemaRouter,
});

export type AppRouter = typeof appRouter;

