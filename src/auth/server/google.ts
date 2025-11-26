import { OAuth2Client } from 'google-auth-library';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

/**
 * Get environment variables at request time (not module load time)
 * This ensures .env files are properly loaded before reading values
 */
function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

function getGoogleClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET;
}

function getGoogleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || '/api/auth/callback';
}

function getBaseUrl(): string {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:5173';
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleAuthConfigured(): boolean {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  return !!(clientId && clientSecret);
}

/**
 * Get Google OAuth client
 */
export function getGoogleOAuthClient(): OAuth2Client | null {
  if (!isGoogleAuthConfigured()) {
    return null;
  }
  
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return new OAuth2Client(
    clientId,
    clientSecret,
    `${getBaseUrl()}${getGoogleRedirectUri()}`
  );
}

/**
 * Get Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string | null {
  const client = getGoogleOAuthClient();
  if (!client) {
    return null;
  }
  
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || undefined,
    prompt: 'consent',
  });
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  idToken: string;
  accessToken: string;
} | null> {
  const client = getGoogleOAuthClient();
  if (!client) {
    return null;
  }
  
  try {
    const { tokens } = await client.getToken(code);
    
    if (!tokens.id_token || !tokens.access_token) {
      return null;
    }
    
    return {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

/**
 * Verify Google ID token and get user info
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  const client = getGoogleOAuthClient();
  const clientId = getGoogleClientId();
  
  if (!client || !clientId) {
    return null;
  }
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return null;
    }
    
    return {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name || null,
      picture: payload.picture || null,
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}

/**
 * Get user info from Google using access token
 */
export async function getUserInfoFromGoogle(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      email: data.email,
      name: data.name || null,
      picture: data.picture || null,
    };
  } catch (error) {
    console.error('Error fetching user info from Google:', error);
    return null;
  }
}

