import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/index';
import type { Context } from '../../server/trpc';
import { getSessionTokenFromCookies, verifySessionToken } from '../../auth/server/session';
import { findSessionByToken } from '../../server/lib/db';
import { sql } from '../../server/lib/db-connection';

export const config = {
  runtime: 'edge',
};

async function createContext(opts: { req: Request }): Promise<Context> {
  const { req } = opts;
  
  // Ensure req is valid
  if (!req || !req.headers) {
    return {
      user: null,
      req: req || new Request('http://localhost'),
    };
  }

  // Extract session token from cookies
  const cookieHeader = req.headers.get('cookie');
  const sessionToken = getSessionTokenFromCookies(cookieHeader);
  
  if (!sessionToken) {
    return {
      user: null,
      req,
    };
  }

  // Verify JWT token
  const payload = await verifySessionToken(sessionToken);
  if (!payload) {
    return {
      user: null,
      req,
    };
  }

  // Check if session exists in database
  const session = await findSessionByToken(payload.sessionId);
  if (!session) {
    return {
      user: null,
      req,
    };
  }

  // Get user from database
  try {
    const result = await sql`
      SELECT id, google_id, email, name, avatar_url, created_at, updated_at
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return {
        user: null,
        req,
      };
    }

    const row = result.rows[0];
    return {
      user: {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      },
      req,
    };
  } catch (error) {
    console.error('Error fetching user in context:', error);
    return {
      user: null,
      req,
    };
  }
}

export const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export default handler;

