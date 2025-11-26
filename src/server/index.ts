import { router, publicProcedure } from './trpc';
import { z } from 'zod';

const schemaSql = `
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);
`.trim();

async function hashSchema(schema: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(schema);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

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
  schema: router({
    getSchema: publicProcedure.query(async () => {
      const schema = schemaSql.trim();
      const hash = await hashSchema(schema);
      return {
        schema,
        hash,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;

