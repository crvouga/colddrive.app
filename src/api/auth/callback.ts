import { exchangeCodeForTokens, verifyGoogleToken, isGoogleAuthConfigured } from '../../auth/server/google';
import { upsertUser } from '../../auth/server/db';
import { createSessionToken, createSessionCookie } from '../../auth/server/session';
import { createSession, generateSessionToken } from '../../auth/server/db';

export const config = {
  runtime: 'edge',
};

export async function handler(req: Request): Promise<Response> {
  // Check if Google auth is configured
  if (!isGoogleAuthConfigured()) {
    return new Response('Google OAuth is not configured', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error);
    return Response.redirect(new URL('/?error=oauth_error', origin));
  }

  // Handle missing code
  if (!code) {
    return Response.redirect(new URL('/?error=missing_code', origin));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return Response.redirect(new URL('/?error=token_exchange_failed', origin));
    }

    // Verify the ID token
    const googleUser = await verifyGoogleToken(tokens.idToken);
    if (!googleUser) {
      return Response.redirect(new URL('/?error=token_verification_failed', origin));
    }

    // Create or update user in database
    const user = await upsertUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    });

    // Generate session token
    const sessionTokenString = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session in database
    await createSession({
      userId: user.id,
      sessionToken: sessionTokenString,
      expiresAt,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    // Create JWT session token
    const jwtToken = await createSessionToken({
      userId: user.id,
      sessionId: sessionTokenString,
    });

    // Create session cookie
    const cookie = createSessionCookie(jwtToken);

    // Redirect to app with cookie set
    const response = Response.redirect(new URL('/', origin));
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return Response.redirect(new URL('/?error=auth_failed', origin));
  }
}

export default handler;

