import { z } from 'zod';
import { publicProcedure, router } from './trpc';

export const schemaSql = `
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);
`.trim();

export async function hashSchema(schema: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(schema);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}


export const clientSideSchemaRouter = router({
  get: publicProcedure
    .output(
      z.object({
        schema: z.string(),
        hash: z.string(),
      })
    )
    .query(async () => {
      const schema = schemaSql.trim();
      const hash = await hashSchema(schema);
      return {
        schema,
        hash,
      };
    }),
});
