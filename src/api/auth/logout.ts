import { getSessionTokenFromCookies, verifySessionToken, createSessionDeleteCookie } from '../../auth/server/session';
import { deleteSession } from '../../server/lib/db';

export const config = {
  runtime: 'edge',
};

export async function handler(req: Request): Promise<Response> {
  // Extract session token from cookies
  const cookieHeader = req.headers.get('cookie');
  const sessionToken = getSessionTokenFromCookies(cookieHeader);
  
  if (sessionToken) {
    // Verify token to get session ID
    const payload = await verifySessionToken(sessionToken);
    if (payload) {
      // Delete session from database
      await deleteSession(payload.sessionId);
    }
  }

  // Create delete cookie
  const deleteCookie = createSessionDeleteCookie();
  
  // Return success response with delete cookie header
  // Can't modify Response.redirect() headers (immutable), so create new Response
  const url = new URL(req.url);
  return new Response(null, {
    status: 302,
    headers: {
      'Location': new URL('/', url.origin).toString(),
      'Set-Cookie': deleteCookie,
    },
  });
}

export default handler;

